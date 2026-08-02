import { loadConfig } from "../config.js";
import { createLLMProvider } from "./provider.js";

/**
 * Aşama 1 doğrulama scripti.
 * config.json'daki persona + LLM sağlayıcıyı yükler, tek bir test
 * mesajı gönderir ve cevabı ekrana basar.
 *
 * Kullanım: npm run test:llm
 */
async function main() {
  const config = loadConfig();
  const provider = await createLLMProvider(config.llm);

  console.log(`[${provider.name}] sağlayıcısı yüklendi, model: ${config.llm.model}`);
  console.log(`Persona: ${config.persona.name}\n`);

  const messages = [
    { role: "system", content: config.persona.systemPrompt },
    { role: "user", content: "Merhaba! Kendini kısaca tanıtır mısın?" },
  ];

  console.log("Kullanıcı: Merhaba! Kendini kısaca tanıtır mısın?");
  const reply = await provider.chat(messages);
  console.log(`${config.persona.name}: ${reply}`);
}

main().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
