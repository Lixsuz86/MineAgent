import { spawn } from "node:child_process";
import { TTSProvider } from "./provider.js";

/**
 * Piper — tamamen yerel çalışan, ücretsiz bir TTS motoru. İnternet
 * gerektirmez, hiçbir API kotası yoktur. Kullanıcının makinesinde
 * `piper` binary'sinin ve bir `.onnx` ses modelinin kurulu olması
 * gerekir.
 *
 * Kurulum: https://github.com/rhasspy/piper
 *
 * config.json örneği:
 * "tts": {
 *   "provider": "piper",
 *   "piperExecutable": "piper",              // PATH'te değilse tam yol verin
 *   "modelPath": "./models/en_US-amy-medium.onnx"
 * }
 */
export class PiperProvider extends TTSProvider {
  constructor(config) {
    super(config);
    this.executable = config.piperExecutable || "piper";
    this.modelPath = config.modelPath;

    if (!this.modelPath) {
      throw new Error(
        "config.json içinde tts.modelPath ayarlanmamış. Piper için bir .onnx " +
          "ses modeli indirip yolunu buraya girin: https://github.com/rhasspy/piper#voices"
      );
    }
  }

  get name() {
    return "piper";
  }

  async speak(text) {
    return new Promise((resolve, reject) => {
      const args = ["--model", this.modelPath, "--output-raw"];
      const proc = spawn(this.executable, args);

      const chunks = [];
      let stderrOutput = "";

      proc.stdout.on("data", (chunk) => chunks.push(chunk));
      proc.stderr.on("data", (chunk) => (stderrOutput += chunk.toString()));

      proc.on("error", (err) => {
        reject(
          new Error(
            `Piper çalıştırılamadı ("${this.executable}"). Kurulu olduğundan ve ` +
              `PATH'te olduğundan emin olun. Detay: ${err.message}`
          )
        );
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Piper hata koduyla kapandı (${code}): ${stderrOutput}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });

      proc.stdin.write(text);
      proc.stdin.end();
    });
  }
}
