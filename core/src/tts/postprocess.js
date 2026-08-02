import { spawn } from "node:child_process";

/**
 * Ses buffer'ına pitch shift ve/veya hafif "robotik" efekt uygular.
 * Video referansındaki yaklaşımı (kayıt + voice changer + pitch/robo
 * efekt) taklit etmek için: TTS çıktısını burada işleyip persona'ya
 * daha karakteristik bir ton kazandırabilirsiniz.
 *
 * ffmpeg gerektirir (harici bağımlılık, sistemde kurulu olmalı).
 * https://ffmpeg.org/download.html
 *
 * @param {Buffer} audioBuffer - ham WAV/PCM ses verisi
 * @param {object} options
 * @param {number} [options.pitchShift] - yarım ton cinsinden kaydırma (örn. -2 = daha pes)
 * @param {boolean} [options.roboEffect] - hafif robotik/metalik efekt eklensin mi
 * @returns {Promise<Buffer>} işlenmiş ses verisi
 */
export async function applyPostProcessing(audioBuffer, options = {}) {
  const { pitchShift = 0, roboEffect = false } = options;

  if (!pitchShift && !roboEffect) {
    return audioBuffer; // hiçbir efekt istenmiyor, olduğu gibi döndür
  }

  const filters = [];

  if (pitchShift) {
    // asetrate ile örnekleme hızını değiştirip pitch'i kaydırıyoruz,
    // ardından atempo ile orijinal hızına geri getiriyoruz ki süre bozulmasın.
    const factor = Math.pow(2, pitchShift / 12);
    filters.push(`asetrate=44100*${factor},aresample=44100,atempo=${1 / factor}`);
  }

  if (roboEffect) {
    // Hafif metalik/robotik his için basit bir chorus + tremolo kombinasyonu.
    filters.push("chorus=0.6:0.9:50:0.4:0.25:2,tremolo=f=8:d=0.3");
  }

  return runFfmpegFilter(audioBuffer, filters.join(","));
}

function runFfmpegFilter(inputBuffer, filterChain) {
  return new Promise((resolve, reject) => {
    const args = [
      "-f", "wav", "-i", "pipe:0",
      "-af", filterChain,
      "-f", "wav", "pipe:1",
    ];

    const proc = spawn("ffmpeg", args);
    const chunks = [];
    let stderrOutput = "";

    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (chunk) => (stderrOutput += chunk.toString()));

    proc.on("error", (err) => {
      reject(
        new Error(
          `ffmpeg çalıştırılamadı. Kurulu olduğundan emin olun: ` +
            `https://ffmpeg.org/download.html — Detay: ${err.message}`
        )
      );
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg hata koduyla kapandı (${code}): ${stderrOutput}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    proc.stdin.write(inputBuffer);
    proc.stdin.end();
  });
}
