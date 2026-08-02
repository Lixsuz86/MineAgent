import { LLMProvider } from "./provider.js";

/**
 * Google Gemini — ücretsiz tier'ı cömert olan bir sağlayıcı.
 * API key: https://aistudio.google.com/apikey adresinden ücretsiz alınır.
 */
export class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.apiKey = resolveApiKey(config.apiKey);
    this.model = config.model || "gemini-1.5-flash";

    if (!this.apiKey) {
      throw new Error(
        "Gemini API key bulunamadı. .env dosyasına GEMINI_API_KEY=... ekleyin " +
          "veya config.json içinde llm.apiKey alanını ayarlayın."
      );
    }
  }

  get name() {
    return "gemini";
  }

  async chat(messages) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent` +
      `?key=${this.apiKey}`;

    // Gemini "system" rolünü ayrı bir alanda bekler, "user"/"assistant"
    // yerine "user"/"model" kullanır — burada dönüştürüyoruz.
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const body = {
      contents: conversationMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: this.config.temperature ?? 0.8,
        maxOutputTokens: this.config.maxTokens ?? 300,
      },
    };

    if (systemMessages.length > 0) {
      body.systemInstruction = {
        parts: [{ text: systemMessages.map((m) => m.content).join("\n") }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API hatası (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini API beklenmeyen bir cevap döndürdü: " + JSON.stringify(data));
    }

    return text.trim();
  }
}

function resolveApiKey(value) {
  if (!value) return process.env.GEMINI_API_KEY;
  if (value.startsWith("env:")) {
    return process.env[value.slice(4)];
  }
  return value;
}
