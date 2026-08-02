import { spawn } from "node:child_process";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Yerel whisper.cpp CLI binary'sini kullanarak ses -> yazı çevirisi
 * yapar. Tamamen offline çalışır, API key gerektirmez.
 *
 * Kurulum: https://github.com/ggml-org/whisper.cpp
 * Derledikten sonra ortaya çıkan `whisper-cli` (veya eski adıyla
 * `main`) binary'si ve bir `.bin` model dosyası gerekir.
 *
 * @param {Buffer} wavBuffer - 16kHz mono WAV ses verisi
 * @param {object} config
 * @param {string} config.executable - whisper-cli binary yolu
 * @param {string} config.modelPath - .bin model dosyası yolu
 * @returns {Promise<string>} algılanan metin
 */
export async function transcribeWithWhisperCpp(wavBuffer, config) {
  if (!config.modelPath) {
    throw new Error(
      "config.json içinde voiceChat.whisperModelPath ayarlanmamış. " +
        "Bir .bin model dosyası indirip yolunu girin: " +
        "https://github.com/ggml-org/whisper.cpp#quick-start"
    );
  }

  const executable = config.executable || "whisper-cli";
  const tempWavPath = join(tmpdir(), `mc-ai-agent-${randomUUID()}.wav`);
  const outputTxtPath = `${tempWavPath}.txt`;

  await writeFile(tempWavPath, wavBuffer);

  try {
    await runWhisperCli(executable, [
      "-m", config.modelPath,
      "-f", tempWavPath,
      "-otxt",
      "-of", tempWavPath, // whisper-cli, .txt uzantısını kendisi ekliyor
      "-nt", // zaman damgalarını çıktıya ekleme
    ]);

    const text = await readFile(outputTxtPath, "utf-8");
    return text.trim();
  } finally {
    await unlink(tempWavPath).catch(() => {});
    await unlink(outputTxtPath).catch(() => {});
  }
}

function runWhisperCli(executable, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args);
    let stderrOutput = "";

    proc.stderr.on("data", (chunk) => (stderrOutput += chunk.toString()));

    proc.on("error", (err) => {
      reject(
        new Error(
          `whisper-cli çalıştırılamadı ("${executable}"). Kurulu olduğundan ve ` +
            `PATH'te olduğundan emin olun. Detay: ${err.message}`
        )
      );
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`whisper-cli hata koduyla kapandı (${code}): ${stderrOutput}`));
        return;
      }
      resolve();
    });
  });
}
