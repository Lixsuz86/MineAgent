/**
 * Ortak LLM sağlayıcı sözleşmesi.
 *
 * Her sağlayıcı (groq.js, gemini.js, ...) bu sınıftan türeyip
 * `chat()` metodunu implement eder. Agent loop ve diğer katmanlar
 * hiçbir zaman doğrudan bir sağlayıcıya bağımlı olmaz — sadece bu
 * arayüzü bilir. Yeni bir sağlayıcı eklemek = bu sözleşmeyi
 * karşılayan yeni bir dosya eklemek.
 */
export class LLMProvider {
  /**
   * @param {object} config - config.json'daki `llm` bölümü
   */
  constructor(config) {
    if (new.target === LLMProvider) {
      throw new Error(
        "LLMProvider soyut bir sınıftır, doğrudan örneklenemez. " +
          "GroqProvider veya GeminiProvider gibi bir alt sınıf kullanın."
      );
    }
    this.config = config;
  }

  /**
   * Modelden bir cevap ister.
   *
   * @param {Array<{role: "system"|"user"|"assistant", content: string}>} messages
   * @returns {Promise<string>} modelin ürettiği metin cevabı
   */
  async chat(messages) {
    throw new Error("chat() alt sınıfta implement edilmeli");
  }

  /**
   * Sağlayıcı adı (loglama ve hata mesajları için).
   * @returns {string}
   */
  get name() {
    return "unknown-provider";
  }
}

/**
 * config.json + .env içeriğine göre doğru sağlayıcıyı oluşturan factory.
 * Yeni bir sağlayıcı eklendiğinde sadece burayı güncellemek yeterli.
 *
 * @param {object} llmConfig - config.json'daki `llm` bölümü
 * @returns {Promise<LLMProvider>}
 */
export async function createLLMProvider(llmConfig) {
  switch (llmConfig.provider) {
    case "groq": {
      const { GroqProvider } = await import("./groq.js");
      return new GroqProvider(llmConfig);
    }
    case "gemini": {
      const { GeminiProvider } = await import("./gemini.js");
      return new GeminiProvider(llmConfig);
    }
    default:
      throw new Error(
        `Bilinmeyen LLM sağlayıcı: "${llmConfig.provider}". ` +
          `Desteklenenler: "groq", "gemini".`
      );
  }
}
