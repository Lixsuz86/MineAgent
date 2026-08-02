import { spawn } from "node:child_process";

/**
 * Bir ses buffer'ını (WAV) kullanıcının sistem hoparlörüne çalar.
 * ffplay (ffmpeg paketiyle birlikte gelir) kullanır, ekstra bağımlılık
 * gerektirmez.
 *
 * @param {Buffer} audioBuffer
 * @returns {Promise<void>}
 */
export function playAudio(audioBuffer) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffplay", ["-autoexit", "-nodisp", "-loglevel", "quiet", "pipe:0"]);

    proc.on("error", (err) => {
      reject(
        new Error(
          `ffplay çalıştırılamadı. ffmpeg kurulu olduğundan emin olun: ` +
            `https://ffmpeg.org/download.html — Detay: ${err.message}`
        )
      );
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffplay hata koduyla kapandı (${code})`));
        return;
      }
      resolve();
    });

    proc.stdin.write(audioBuffer);
    proc.stdin.end();
  });
}
