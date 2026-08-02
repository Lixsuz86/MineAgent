# MC AI Agent — Masaüstü Uygulaması

Terminal kullanmadan, tıkla-çalıştır şeklinde bir Minecraft AI ajanı
kurulum ve kontrol arayüzü. `core/` klasöründeki agent motorunu
Electron ile sarmalayan bir masaüstü uygulaması.

## Bu Ne İşe Yarar?

Önceki komut satırı sürümünde kullanıcı `.env` dosyası düzenlemek,
`config.json`'ı elle yazmak ve terminalde `npm start` çalıştırmak
zorundaydı. Bu masaüstü sürümü aynı motoru kullanır ama:

- Tüm ayarlar (persona, API key, sunucu bilgisi, ses, skin) bir
  formda dolduruluyor
- "Kaydet" ve "Başlat" birer buton
- Bot çalışırken canlı log ekranı gösteriliyor
- Ayrı bir "Sesli Sohbet" sekmesinden mikrofonla karakterle
  konuşulabiliyor
- Hiçbir terminal komutu gerekmiyor

## Sesli Sohbet

Uygulamadaki "Sesli Sohbet" sekmesi, Minecraft botunun oyun içi
davranışından bağımsız, mikrofonla anlık konuşabileceğin ayrı bir
sohbet penceresi:

- **"Oyun durumunu dahil et"** işaretlenirse ve bot o an
  çalışıyorsa, LLM'e konumun, canın ve çevrendeki blokların anlık
  durumu da gönderilir — "şu an ne yapıyorsun" gibi sorulara gerçek
  cevap verebilir. İşaretli değilse veya bot çalışmıyorsa, tamamen
  bağımsız serbest sohbet olarak çalışır.
- **Mikrofon modu** ayarlardan seçilebilir: tıkla-başlat/durdur veya
  basılı-tut-konuş.
- Cevaplar hem yazı olarak görünür hem de (bir TTS sağlayıcı
  seçiliyse) sesli okunur.

**Ses tanıma (mikrofon → yazı) için whisper.cpp gerekir** — tamamen
yerel ve ücretsiz çalışır, internet gerektirmez:
https://github.com/ggml-org/whisper.cpp. Kurulumdan sonra binary
yolunu ve `.bin` model dosyasını Ayarlar sekmesindeki "Sesli
Sohbet — Ses Tanıma" bölümünden seçebilirsin.

*Not: Chromium'un tarayıcı-içi ses tanıma API'si (Web Speech API)
Electron gibi masaüstü ortamlarında güvenilir çalışmadığı için
kullanılmadı — whisper.cpp gerçekten çalışan tek seçenek.*

## Geliştirici Olarak Çalıştırma

```bash
npm install
npm start
```

Bu, uygulamayı geliştirme modunda açar (Electron penceresi).

## Dağıtılabilir Paket Oluşturma (Installer)

Kullanıcıların indirip çift tıklayacağı gerçek kurulum dosyasını
üretmek için:

```bash
npm run build:win     # Windows için .exe kurulum dosyası
npm run build:mac     # macOS için .dmg
npm run build:linux   # Linux için .AppImage
```

Çıktılar `dist/` klasöründe oluşur. Bu komutlar `electron-builder`
kullanır ve ilk çalıştırmada platform-özel Electron binary'lerini
indirir (internet bağlantısı gerekir, birkaç yüz MB).

**Not:** Çapraz platform paketleme sınırlamaları vardır — Windows
`.exe` üretmek için genelde Windows (veya Wine kurulu Linux),
macOS `.dmg` için macOS gerekir. En güvenilir yol, her paketi kendi
işletim sisteminde build etmek veya GitHub Actions gibi bir CI
üzerinden otomatikleştirmektir.

## Mimari

```
mc-ai-agent-desktop/
├── core/                    # önceki CLI sürümünün motoru
│   ├── src/
│   │   ├── agent-runner.js   # startAgent() — hem CLI hem GUI kullanır
│   │   ├── voice-chat.js      # sesli sohbet oturumu (LLM, oyun bağlamlı/bağımsız)
│   │   ├── index.js           # CLI giriş noktası (npm start ile, core/ içinde)
│   │   ├── llm/ minecraft/ tts/ agent/
│   │   ├── stt/
│   │   │   └── whisper-cpp.js  # yerel ses tanıma (whisper.cpp CLI köprüsü)
│   │   └── config.js
│   └── config/
│       ├── config.example.json
│       └── personas/
├── src/                     # Electron katmanı
│   ├── main.js               # ana süreç: pencere, IPC, agent + sesli sohbet kontrolü
│   ├── preload.js            # renderer'a güvenli API köprüsü
│   └── renderer/
│       ├── index.html         # form arayüzü + sesli sohbet paneli
│       └── app.js             # form senkronizasyonu + mikrofon/STT/TTS mantığı
└── package.json              # electron-builder yapılandırması içerir
```

`core/` klasörü kendi başına da çalışabilir bir CLI projesidir
(`cd core && npm start`) — Electron katmanı onu bir kütüphane gibi
`agent-runner.js` üzerinden çağırır, hiçbir çekirdek dosyayı
değiştirmez.

## Kullanıcı Deneyimi Akışı

1. Kullanıcı installer'ı indirir, çift tıklar, kurar
2. Uygulamayı açar — form karşısına çıkar
3. Persona seçer (hazır 3 örnekten biri veya kendi yazdığı)
4. LLM sağlayıcı seçer, ücretsiz API key'ini yapıştırır
5. Minecraft sunucu bilgilerini girer
6. İsteğe bağlı: skin ve ses ayarlarını yapar
7. "Başlat" — bot bağlanır, canlı log ekranı açılır
8. "Durdur" ile istediği an kapatır

Hiçbir adımda terminal, `.env` dosyası veya JSON düzenleme yok.
