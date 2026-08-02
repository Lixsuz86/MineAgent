import { LLMProvider } from "./provider.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq — ücretsiz, çok hızlı inference sunan bir sağlayıcı.
 * Llama 3.x ve Mixtral gibi açık modelleri barındırıyor.
 * API key: https://console.groq.com adresinden ücretsiz alınır.
 */
export class GroqProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.apiKey = resolveApiKey(config.apiKey);
    this.model = config.model || "llama-3.1-70b-versatile";

    if (!this.apiKey) {
      throw new Error(
        "Groq API key bulunamadı. .env dosyasına GROQ_API_KEY=... ekleyin " +
          "veya config.json içinde llm.apiKey alanını ayarlayın."
      );
    }
  }

  get name() {
    return "groq";
  }

  async chat(messages) {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.config.temperature ?? 0.8,
        max_tokens: this.config.maxTokens ?? 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API hatası (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Groq API beklenmeyen bir cevap döndürdü: " + JSON.stringify(data));
    }

    return text.trim();
  }
}

/**
 * Config'de "env:GROQ_API_KEY" gibi bir değer varsa process.env'den okur,
 * doğrudan bir string verilmişse onu kullanır.
 */
function resolveApiKey(value) {
  if (!value) return process.env.GROQ_API_KEY;
  if (value.startsWith("env:")) {
    return process.env[value.slice(4)];
  }
  return value;
}
