import { perceive } from "../minecraft/perception.js";
import { executeAction } from "../minecraft/actions.js";

const MAX_RECENT_CHAT = 5;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * LLM'in oyun durumunu yorumlayıp bir aksiyon kararı vermesi için
 * kullanılan sistem talimatı. Persona'nın systemPrompt'u ile
 * birleştirilir; burası "nasıl cevap vermeli" kısmını, persona ise
 * "kim olmalı" kısmını tanımlar.
 */
const RESPONSE_FORMAT_INSTRUCTIONS = `
Sen bir Minecraft botusun. Sana oyunun anlık durumu JSON olarak
verilecek. Buna karşılık SADECE aşağıdaki formatlardan birine uyan
tek bir JSON nesnesi döndür, başka hiçbir açıklama ekleme:

{"action": "idle"}
{"action": "say", "text": "..."}
{"action": "goto", "x": 0, "y": 0, "z": 0}
{"action": "mine", "block": "oak_log", "x": 0, "y": 0, "z": 0}
{"action": "lookAt", "x": 0, "y": 0, "z": 0}

Kurallar:
- Sadece geçerli JSON döndür, markdown code block kullanma.
- Biri sana sohbette bir şey söylediyse genelde "say" ile cevap ver.
- Hedefsiz durumlarda "idle" kullan, gereksiz hareket etme.
`.trim();

/**
 * Perceive -> think -> act döngüsünü belirli aralıklarla çalıştırır.
 *
 * Hata toleransı:
 * - Her tur içindeki hatalar (LLM hatası, geçersiz JSON, aksiyon
 *   hatası) döngüyü durdurmaz, sadece o turu atlar.
 * - LLM API'sinden art arda hata gelirse (kota dolması, ağ sorunu),
 *   `intervalMs` üstel olarak artırılır (backoff) — API'yi
 *   bombardımana tutmamak için.
 * - `MAX_CONSECUTIVE_ERRORS` üst üste hata sonrası döngü otomatik
 *   durur ve `onFatalError` çağrılır; sonsuz döngüde sessizce
 *   başarısız olmak yerine kullanıcıya haber verilir.
 * - Bot bağlantısı koparsa (`end` event'i) döngü otomatik durur.
 *
 * @param {import("mineflayer").Bot} bot
 * @param {import("../llm/provider.js").LLMProvider} llmProvider
 * @param {object} persona - config.json'daki `persona` bölümü
 * @param {object} [options]
 * @param {number} [options.intervalMs] - iki döngü arası bekleme (ms)
 * @param {(text: string) => Promise<void>|void} [options.onSpeak] - "say" aksiyonunda çağrılır (TTS için hook)
 * @param {(err: Error) => void} [options.onFatalError] - üst üste çok fazla hata olduğunda çağrılır
 */
export function startAgentLoop(bot, llmProvider, persona, options = {}) {
  const baseIntervalMs = options.intervalMs ?? 5000;
  const recentChat = [];
  bot._recentChat = recentChat;

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    recentChat.push(`${username}: ${message}`);
    if (recentChat.length > MAX_RECENT_CHAT) recentChat.shift();
  });

  let stopped = false;
  let running = false;
  let consecutiveErrors = 0;
  let timer = null;

  // Bot bağlantısı koparsa döngüyü durdur, sessizce boşa dönmeye devam etme.
  bot.once("end", (reason) => {
    console.warn(`[agent] Bot bağlantısı sona erdi (${reason || "bilinmeyen sebep"}), döngü durduruluyor.`);
    stop();
  });

  async function tick() {
    if (stopped || running) return;
    running = true;

    try {
      const state = perceive(bot);

      const messages = [
        { role: "system", content: `${persona.systemPrompt}\n\n${RESPONSE_FORMAT_INSTRUCTIONS}` },
        { role: "user", content: JSON.stringify(state) },
      ];

      const rawReply = await llmProvider.chat(messages);
      const action = parseAction(rawReply);

      if (!action) {
        console.warn(`[agent] LLM cevabı JSON olarak ayrıştırılamadı: ${rawReply}`);
      } else {
        const result = await executeAction(bot, action);

        if (action.action === "say" && result.ok && options.onSpeak) {
          await options.onSpeak(action.text);
        }
      }

      // İşlenen sohbet mesajlarını temizle ki aynı mesaja tekrar tekrar cevap verilmesin.
      recentChat.length = 0;

      // Başarılı tur — hata sayacını ve gecikmeyi sıfırla.
      if (consecutiveErrors > 0) {
        console.log("[agent] Bağlantı toparlandı, normal hıza dönülüyor.");
      }
      consecutiveErrors = 0;
      rescheduleTimer(baseIntervalMs);
    } catch (err) {
      consecutiveErrors += 1;
      console.error(
        `[agent] Döngü hatası (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${err.message}`
      );

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(
          "[agent] Üst üste çok fazla hata oluştu, döngü durduruluyor. " +
            "API key / kota / ağ bağlantınızı kontrol edin."
        );
        stop();
        options.onFatalError?.(err);
        return;
      }

      // Üstel geri basınç: her ardışık hatada bekleme süresini iki katına çıkar.
      const backoffMs = baseIntervalMs * Math.pow(2, consecutiveErrors);
      rescheduleTimer(backoffMs);
    } finally {
      running = false;
    }
  }

  function rescheduleTimer(delayMs) {
    if (timer) clearInterval(timer);
    if (stopped) return;
    timer = setInterval(tick, delayMs);
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
  }

  timer = setInterval(tick, baseIntervalMs);

  return { stop };
}

function parseAction(rawText) {
  // LLM bazen açıklama ekleyebilir; ilk { ile son } arasındaki bloğu almayı dene.
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(rawText.slice(start, end + 1));
  } catch {
    return null;
  }
}
