import { loadConfig } from "./config.js";
import { startAgent } from "./agent-runner.js";

async function main() {
  const config = loadConfig();

  await startAgent(config, {
    onFatalError: () => {
      console.error(
        "\nMuhtemel sebepler:\n" +
          "  - API key geçersiz veya kotanız dolmuş olabilir\n" +
          "  - İnternet bağlantınızda bir sorun olabilir\n" +
          "  - Seçtiğiniz LLM sağlayıcısında geçici bir kesinti olabilir\n\n" +
          "Sorunu giderdikten sonra `npm start` ile yeniden başlatabilirsiniz."
      );
      process.exit(1);
    },
  });

  console.log("Durdurmak için Ctrl+C.");
}

main().catch((err) => {
  console.error("Başlatma hatası:", err.message);
  process.exit(1);
});
