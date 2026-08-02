import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = join(__dirname, "..", "config", "config.json");

/**
 * config.json dosyasını okur. Yoksa kullanıcıyı config.example.json'ı
 * kopyalamaya yönlendiren açıklayıcı bir hata fırlatır.
 *
 * @param {string} [path] - alternatif config yolu (varsayılan: config/config.json)
 */
export function loadConfig(path = DEFAULT_CONFIG_PATH) {
  if (!existsSync(path)) {
    throw new Error(
      `Config dosyası bulunamadı: ${path}\n` +
        `config/config.example.json dosyasını config/config.json olarak kopyalayıp düzenleyin.`
    );
  }

  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}
