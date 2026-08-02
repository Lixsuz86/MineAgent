/**
 * Ortak TTS (metinden sese) sağlayıcı sözleşmesi.
 *
 * LLM tarafındaki provider.js ile aynı desen: her sağlayıcı bu
 * sınıftan türeyip `speak()` metodunu implement eder. Agent loop
 * hiçbir zaman doğrudan bir sağlayıcıya bağımlı olmaz.
 */
export class TTSProvider {
  /**
   * @param {object} config - config.json'daki `tts` bölümü
   */
  constructor(config) {
    if (new.target === TTSProvider) {
      throw new Error(
        "TTSProvider soyut bir sınıftır, doğrudan örneklenemez. " +
          "PiperProvider veya ElevenLabsProvider gibi bir alt sınıf kullanın."
      );
    }
    this.config = config;
  }

  /**
   * Verilen metni sese çevirir.
   *
   * @param {string} text - seslendirilecek metin
   * @returns {Promise<Buffer>} ses verisi (WAV/MP3 formatında, sağlayıcıya göre değişir)
   */
  async speak(text) {
    throw new Error("speak() alt sınıfta implement edilmeli");
  }

  get name() {
    return "unknown-tts-provider";
  }
}

/**
 * config.json + .env içeriğine göre doğru TTS sağlayıcıyı oluşturan
 * factory. Yeni bir sağlayıcı eklendiğinde sadece burayı güncellemek
 * yeterli.
 *
 * @param {object} ttsConfig - config.json'daki `tts` bölümü
 * @returns {Promise<TTSProvider>}
 */
export async function createTTSProvider(ttsConfig) {
  switch (ttsConfig.provider) {
    case "piper": {
      const { PiperProvider } = await import("./piper.js");
      return new PiperProvider(ttsConfig);
    }
    case "elevenlabs": {
      const { ElevenLabsProvider } = await import("./elevenlabs.js");
      return new ElevenLabsProvider(ttsConfig);
    }
    case "none":
    case undefined:
      return null; // ses katmanı devre dışı, agent sadece metinle çalışır
    default:
      throw new Error(
        `Bilinmeyen TTS sağlayıcı: "${ttsConfig.provider}". ` +
          `Desteklenenler: "piper", "elevenlabs", "none".`
      );
  }
}
