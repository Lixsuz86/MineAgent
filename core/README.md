# mc-ai-agent

Özelleştirilebilir, açık kaynak bir Minecraft AI ajanı. Kendi
karakterini (persona), ücretsiz LLM sağlayıcını ve sesini seç, kendi
bilgisayarında çalıştır.

> **Durum:** Aşama 1-4 tamamlandı — LLM katmanı (Groq / Gemini),
> Minecraft entegrasyonu, ses katmanı (Piper / ElevenLabs + pitch/robo
> efekt), hazır persona örnekleri ve hata toleransı (otomatik yeniden
> deneme, bağlantı kopması yönetimi) çalışır durumda. Yol haritası
> için `PROJECT_PLAN.md`'ye bakın.

## Sıfırdan Kurulum (Adım Adım)

Bu rehber, hiç Node.js projesi çalıştırmamış biri için de yeterli.

**1. Gereksinimler**
- [Node.js](https://nodejs.org) (v18 veya üstü)
- Bir Minecraft sunucusu — kendi bilgisayarınızda test etmek için
  [Paper](https://papermc.io) veya vanilla sunucu kurup
  `online-mode=false` yapmanız yeterli
- (Opsiyonel, ses efektleri için) [ffmpeg](https://ffmpeg.org/download.html)

**2. Projeyi indirin ve bağımlılıkları kurun**

```bash
git clone <bu-repo-linki>
cd mc-ai-agent
npm install
```

**3. Config dosyalarını oluşturun**

```bash
cp .env.example .env
cp config/config.example.json config/config.json
```

`config/config.json` dosyası sizin kişisel ayarlarınızı tutar ve
`.gitignore` içinde olduğu için yanlışlıkla GitHub'a yüklenmez —
API key'leriniz güvende kalır.

**4. Bir LLM sağlayıcısı seçip API key alın** (ikisi de ücretsiz)
   - **Groq:** https://console.groq.com → hesap açın → API key
     oluşturun → `.env` dosyasına `GROQ_API_KEY=...` olarak yapıştırın
   - **Gemini:** https://aistudio.google.com/apikey → API key alın →
     `.env` dosyasına `GEMINI_API_KEY=...` olarak yapıştırın

   Sonra `config/config.json` içinde `llm.provider` alanını
   `"groq"` veya `"gemini"` yapın.

**5. Persona seçin**

`config/personas/` klasöründe 3 hazır örnek var — birini kopyalayıp
`config/config.json` içindeki `persona` alanının yerine
yapıştırabilir, ya da kendi karakterinizi yazabilirsiniz:

| Dosya | Karakter |
|---|---|
| `pip-curious-helper.json` | Meraklı, enerjik, arkadaş canlısı |
| `unit7-sarcastic-robot.json` | Alaycı, kuru, robotik ton |
| `scout-silent-explorer.json` | Sessiz, göreve odaklı, sadece gerektiğinde konuşur |

**6. Minecraft bağlantı bilgilerini girin**

`config/config.json` içindeki `minecraft` bölümünde `host`, `port`,
`username` alanlarını sunucunuza göre ayarlayın.

**7. Test edin**

```bash
npm run test:llm
```

Bu, Minecraft'a hiç bağlanmadan sadece LLM + persona kombinasyonunun
çalıştığını doğrular. Bir cevap görüyorsanız devam edebilirsiniz.

**8. Botu başlatın**

```bash
npm start
```

Bot Minecraft sunucunuza bağlanır ve yaşamaya başlar. Durdurmak için
`Ctrl+C`.

## Ses Katmanını Etkinleştirme (Opsiyonel)

`config/config.json` içindeki `tts.provider` alanını ayarlayın:

- **`"none"`** (varsayılan) — ajan sadece metin olarak "konuşur",
  hiçbir ekstra kurulum gerekmez.
- **`"piper"`** — tamamen yerel ve ücretsiz. Piper'ı kurun
  ([rehber](https://github.com/rhasspy/piper)), bir `.onnx` ses
  modeli indirin ve `tts.modelPath` alanına yolunu yazın.
- **`"elevenlabs"`** — bulut tabanlı, kurulumsuz, ücretsiz kotalı.
  https://elevenlabs.io adresinden API key alıp `.env`'e
  `ELEVENLABS_API_KEY` olarak ekleyin, `tts.voiceId` alanına
  kullanmak istediğiniz sesin ID'sini girin. Kendi ses klonunuzu
  oluşturup buraya bağlayabilirsiniz.

Pitch shift ve hafif "robotik" efekt için `tts.postprocess`
alanlarını kullanın (`pitchShift`: yarım ton, `roboEffect`:
true/false). Bu adım **ffmpeg** kurulu olmasını gerektirir — ayrıca
ses çalma (`playback`) için de kullanılıyor.

## Skin Özelleştirme (Opsiyonel, Offline-mode Sunucular İçin)

**Önemli:** Skin, botun kodundan değil, **sunucudan** kontrol edilir.
Mineflayer'ın (veya herhangi bir bot kütüphanesinin) kendi başına
özel bir skin "gönderme" yeteneği yoktur — bu Minecraft protokolünün
doğası. Botunuzun özel bir skin göstermesi için sunucuda
[SkinRestorer](https://skinrestorer.net) veya
[SkinChanger](https://github.com/edoren/SkinChanger) gibi bir
eklenti kurulu olmalı.

Bu eklentilerden biri sunucuda kuruluysa, `config/config.json`
içindeki `skin` bölümünü şöyle ayarlayın:

```json
"skin": {
  "enabled": true,
  "value": "https://example.com/my-skin.png",
  "command": "/skin set {value}"
}
```

- `value` alanına bir skin URL'si veya gerçek bir Minecraft
  kullanıcı adı yazabilirsiniz (eklentiye bağlı olarak ikisi de
  desteklenebilir).
- `command` alanı, kullandığınız eklentinin komut formatına göre
  değiştirilebilir — `{value}` yerine otomatik olarak `value`
  alanınız yerleştirilir.

Sunucuda uygun bir eklenti yoksa, komut sunucu tarafından "bilinmeyen
komut" olarak görmezden gelinir; bot çökmez, sadece Steve/Alex
varsayılan skin'iyle görünmeye devam eder.

Eklentisiz, kendi sunucunuzda tam kontrol istiyorsanız
[SkinRestorer](https://skinrestorer.net)'ı kurup dokümantasyonundaki
adımları izlemeniz yeterli — birçok offline-mode sunucu zaten bunu
kullanıyor.

## Nasıl Çalışır

Bot, config'deki sunucuya bağlanır ve `tickIntervalMs` aralığıyla
(varsayılan 5 saniye) perceive → think → act → speak döngüsüne girer:

1. **Perceive** — konum, can, açlık, envanter, yakındaki oyuncu/mob/
   ilgi çekici bloklar, son sohbet mesajları JSON'a özetlenir.
2. **Think** — bu özet, persona'nın sistem talimatıyla birlikte
   seçtiğiniz LLM'e gönderilir; LLM tek bir aksiyon JSON'u döndürür.
3. **Act** — aksiyon gerçek bir mineflayer komutuna çevrilir: sohbete
   cevap verme (`say`), bir konuma gitme (`goto`), blok kırma
   (`mine`), bir noktaya bakma (`lookAt`) veya hiçbir şey yapmama
   (`idle`).
4. **Speak** *(opsiyonel)* — `say` aksiyonunda üretilen metin,
   seçtiğiniz TTS sağlayıcıya gönderilir, pitch/robo efekt uygulanır
   ve sistem hoparlörünüzden çalınır. `tts.provider: "none"` ise bu
   adım atlanır, sadece konsola yazılır.

## Hata Toleransı

Ajan, gerçek dünya kesintilerine karşı dayanıklı olacak şekilde
tasarlandı:

- **Geçici hatalar** (tek seferlik ağ sorunu, LLM'in bozuk JSON
  döndürmesi) o turu atlar, döngü durmaz.
- **Art arda hatalar** (API kotası dolması, sürekli ağ sorunu)
  üstel geri basınç (exponential backoff) ile denenir — her ardışık
  hatada bekleme süresi iki katına çıkar, API'yi bombardımana
  tutmaz.
- **5 ardışık hatadan sonra** ajan kendini durdurur ve olası
  sebepleri (geçersiz API key, dolu kota, ağ sorunu) ekrana yazar —
  sessizce sonsuz döngüde başarısız olmaz.
- **Minecraft bağlantısı koparsa** ajan bunu algılar ve döngüyü
  otomatik durdurur.
- **Ses katmanındaki hatalar** (TTS API'si veya ffmpeg başarısız
  olursa) sadece o seslendirmeyi atlar, ajanın kendisini durdurmaz.

## Mimari

```
src/
├── index.js             # giriş noktası, her şeyi bağlar
├── config.js             # config.json + .env okuma
├── llm/
│   ├── provider.js        # ortak LLMProvider arayüzü + factory
│   ├── groq.js             # Groq implementasyonu
│   ├── gemini.js           # Gemini implementasyonu
│   └── test-chat.js        # LLM katmanı doğrulama scripti
├── minecraft/
│   ├── bot.js              # mineflayer bağlantısı
│   ├── perception.js       # oyun durumu -> LLM'e uygun özet JSON
│   ├── actions.js          # LLM kararı -> mineflayer komutu
│   └── skin.js             # offline-mode skin komutu gönderme
├── tts/
│   ├── provider.js         # ortak TTSProvider arayüzü + factory
│   ├── piper.js             # Piper implementasyonu (yerel)
│   ├── elevenlabs.js        # ElevenLabs implementasyonu (bulut)
│   ├── postprocess.js       # pitch shift + robo efekt (ffmpeg)
│   └── playback.js          # sistem hoparlörüne çalma
└── agent/
    └── loop.js              # perceive -> think -> act -> speak döngüsü
                               # + hata toleransı (backoff, fatal stop)
```

Yeni bir LLM veya TTS sağlayıcı eklemek için ilgili `Provider`
sınıfından türeyen yeni bir dosya yazıp `provider.js` içindeki
factory fonksiyonuna bir `case` eklemeniz yeterli.

## Sırada ne var

Ana iskelet tamamlandı. Fikir olarak eklenebilecekler:

- Yerel LLM desteği (Ollama) ileri seviye kullanıcılar için
- Stream/overlay çıktısı (OBS için metin/ses gösterimi)
- Görev planlama derinliği (çoklu adım hedefler, hafıza)
