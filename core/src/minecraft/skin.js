/**
 * Offline-mode sunucularda bot skin'ini özelleştirme.
 *
 * ÖNEMLİ: Skin, istemci (bot) tarafından değil, SUNUCU tarafından
 * kontrol edilir. Mineflayer'ın veya hiçbir bot kütüphanesinin kendi
 * başına bir skin "gönderme" yeteneği yoktur — bu Minecraft
 * protokolünün çalışma şekli. Bir botun özel skin göstermesi için
 * sunucuda SkinRestorer (https://skinrestorer.net) veya SkinChanger
 * (https://github.com/edoren/SkinChanger) gibi bir eklenti kurulu
 * olması ve botun spawn olduktan sonra o eklentinin komutunu
 * göndermesi gerekir.
 *
 * Bu modül, config'deki `skin` bölümüne göre uygun komutu botun
 * kendi sohbetine yazar. Sunucuda uygun eklenti yoksa komut
 * sessizce görmezden gelinir (sunucu "bilinmeyen komut" der,
 * bot çökmez).
 */

/**
 * @param {import("mineflayer").Bot} bot
 * @param {object} skinConfig - config.json'daki `skin` bölümü
 */
export function applySkin(bot, skinConfig) {
  if (!skinConfig?.enabled) return;

  if (!skinConfig.value) {
    console.warn(
      "[skin] skin.enabled=true ama skin.value boş, skin ayarlanamıyor."
    );
    return;
  }

  const commandTemplate = skinConfig.command || "/skin set {value}";
  const command = commandTemplate.replace("{value}", skinConfig.value);

  console.log(`[skin] Skin komutu gönderiliyor: ${command}`);
  bot.chat(command);

  // Sunucunun cevabını (SkinRestorer/SkinChanger genelde bir onay ya
  // da hata mesajı basar) kısa süre dinleyip kullanıcıya bilgi verelim.
  // Bu tamamen bilgilendirme amaçlı; skin komutu zaten gönderildi.
  const onMessage = (jsonMsg) => {
    const text = jsonMsg.toString().toLowerCase();
    if (
      text.includes("skin") ||
      text.includes("unknown command") ||
      text.includes("bilinmeyen komut")
    ) {
      console.log(`[skin] Sunucu cevabı: ${jsonMsg.toString()}`);
      bot.removeListener("message", onMessage);
    }
  };

  bot.on("message", onMessage);
  setTimeout(() => bot.removeListener("message", onMessage), 5000);
}
