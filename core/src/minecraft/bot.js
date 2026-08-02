import mineflayer from "mineflayer";
import pathfinderPkg from "mineflayer-pathfinder";
const { pathfinder } = pathfinderPkg;

/**
 * config.json'daki `minecraft` bölümüne göre bir mineflayer botu
 * oluşturur ve sunucuya bağlanır. Bağlantı ayrıntıları (host, port,
 * kullanıcı adı, sürüm) tamamen config'den gelir — kodda hiçbir
 * sunucu bilgisi hardcoded değildir.
 *
 * @param {object} mcConfig - config.json'daki `minecraft` bölümü
 * @returns {Promise<import("mineflayer").Bot>}
 */
export function createBot(mcConfig) {
  const bot = mineflayer.createBot({
    host: mcConfig.host || "localhost",
    port: mcConfig.port || 25565,
    username: mcConfig.username || "AIAgent",
    version: mcConfig.version || false, // false = otomatik algıla
    auth: mcConfig.auth || "offline", // "offline" | "microsoft"
  });

  bot.loadPlugin(pathfinder);

  return new Promise((resolve, reject) => {
    bot.once("spawn", () => {
      console.log(`[minecraft] "${bot.username}" olarak sunucuya bağlanıldı.`);
      resolve(bot);
    });

    bot.once("error", (err) => {
      reject(new Error(`Minecraft bağlantı hatası: ${err.message}`));
    });

    bot.once("kicked", (reason) => {
      reject(new Error(`Sunucudan atıldı: ${reason}`));
    });
  });
}
