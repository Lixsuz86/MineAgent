import { perceive } from "./minecraft/perception.js";

const MAX_HISTORY_TURNS = 10; // kullanıcı+asistan çifti sayısı

/**
 * Kullanıcıyla sesli (veya yazılı) serbest sohbeti yöneten oturum.
 * Minecraft agent loop'undan tamamen bağımsız çalışır — bot oyunda
 * olsun ya da olmasın bu sohbet kullanılabilir. `bot` verilirse ve
 * `includeGameContext` açıksa, her mesajda o anki oyun durumu
 * (konum, can, envanter vb.) LLM'e otomatik olarak ekleniyor.
 */
export class VoiceChatSession {
  /**
   * @param {import("./llm/provider.js").LLMProvider} llmProvider
   * @param {object} persona - config.json'daki `persona` bölümü
   */
  constructor(llmProvider, persona) {
    this.llmProvider = llmProvider;
    this.persona = persona;
    this.history = []; // { role: "user"|"assistant", content: string }[]
  }

  /**
   * Kullanıcıdan gelen bir mesajı işler, LLM cevabını döndürür.
   *
   * @param {string} userText - kullanıcının (STT'den gelen veya yazılı) mesajı
   * @param {object} [options]
   * @param {import("mineflayer").Bot|null} [options.bot] - oyun bağlamı eklemek için bot referansı
   * @param {boolean} [options.includeGameContext] - true ise ve bot varsa, oyun durumu mesaja eklenir
   * @returns {Promise<string>} LLM'in metin cevabı
   */
  async send(userText, options = {}) {
    const { bot = null, includeGameContext = false } = options;

    let systemPrompt = this.persona.systemPrompt;

    if (includeGameContext && bot) {
      try {
        const state = perceive(bot);
        systemPrompt +=
          "\n\nAyrıca şu anki oyun durumun (gerekirse cevabında kullan): " +
          JSON.stringify(state);
      } catch {
        // Bot henüz spawn olmamış veya durum okunamıyor olabilir;
        // sessizce oyun bağlamı olmadan devam et.
        systemPrompt += "\n\n(Şu anda oyunda değilsin, sadece sohbet ediyorsun.)";
      }
    } else if (includeGameContext && !bot) {
      systemPrompt += "\n\n(Şu anda oyunda değilsin, sadece sohbet ediyorsun.)";
    }

    systemPrompt +=
      "\n\nBu bir sesli sohbet penceresi. Kısa, doğal, konuşma diline uygun cevaplar ver. " +
      "Markdown veya liste kullanma, düz konuşma metni yaz.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...this.history,
      { role: "user", content: userText },
    ];

    const reply = await this.llmProvider.chat(messages);

    this.history.push({ role: "user", content: userText });
    this.history.push({ role: "assistant", content: reply });

    // Geçmişi sınırla ki context şişmesin.
    const maxMessages = MAX_HISTORY_TURNS * 2;
    if (this.history.length > maxMessages) {
      this.history = this.history.slice(this.history.length - maxMessages);
    }

    return reply;
  }

  /** Konuşma geçmişini temizler. */
  clear() {
    this.history = [];
  }
}
