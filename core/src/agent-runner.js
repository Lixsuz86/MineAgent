import { createLLMProvider } from "./llm/provider.js";
import { createTTSProvider } from "./tts/provider.js";
import { applyPostProcessing } from "./tts/postprocess.js";
import { playAudio } from "./tts/playback.js";
import { createBot } from "./minecraft/bot.js";
import { applySkin } from "./minecraft/skin.js";
import { startAgentLoop } from "./agent/loop.js";

/**
 * Verilen config nesnesine göre agent'ı baştan sona kurar ve başlatır.
 * `process.exit()` ÇAĞIRMAZ — çağıran taraf (CLI veya Electron ana
 * süreci) hata/durum yönetimini kendisi yapar. Bu sayede aynı
 * fonksiyon hem `npm start` hem de masaüstü uygulaması tarafından
 * güvenle kullanılabilir.
 *
 * @param {object} config - config.json içeriğiyle aynı şekil
 * @param {object} [callbacks]
 * @param {(line: string) => void} [callbacks.onLog] - her log satırı için çağrılır (varsayılan: console.log)
 * @param {(line: string) => void} [callbacks.onWarn] - uyarılar için çağrılır (varsayılan: console.warn)
 * @param {(err: Error) => void} [callbacks.onFatalError] - üst üste çok fazla hata olduğunda çağrılır
 * @returns {Promise<{ stop: () => void }>} agent'ı durdurmak için bir kontrol nesnesi
 */
export async function startAgent(config, callbacks = {}) {
  const log = callbacks.onLog || console.log;
  const warn = callbacks.onWarn || console.warn;

  log(`Persona: ${config.persona.name}`);
  log(`LLM sağlayıcı: ${config.llm.provider} (${config.llm.model})`);
  log(`Ses sağlayıcı: ${config.tts?.provider || "none"}`);

  const llmProvider = await createLLMProvider(config.llm);
  const ttsProvider = await createTTSProvider(config.tts || {});
  const bot = await createBot(config.minecraft);

  applySkin(bot, config.skin);

  const loopHandle = startAgentLoop(bot, llmProvider, config.persona, {
    intervalMs: config.behavior?.tickIntervalMs ?? 5000,
    onSpeak: async (text) => {
      log(`[speak] ${text}`);

      if (!ttsProvider) return; // ses katmanı devre dışı, sadece metin yeterli

      try {
        const rawAudio = await ttsProvider.speak(text);
        const processedAudio = await applyPostProcessing(rawAudio, {
          pitchShift: config.tts?.postprocess?.pitchShift ?? 0,
          roboEffect: config.tts?.postprocess?.roboEffect ?? false,
        });
        await playAudio(processedAudio);
      } catch (err) {
        warn(`[tts] Seslendirme başarısız: ${err.message}`);
      }
    },
    onFatalError: (err) => {
      warn(
        `Agent döngüsü durduruldu çünkü art arda çok fazla hata oluştu. Son hata: ${err.message}`
      );
      callbacks.onFatalError?.(err);
    },
  });

  log("Agent döngüsü başladı.");

  return {
    bot,
    stop() {
      loopHandle.stop();
      bot.quit();
    },
  };
}
