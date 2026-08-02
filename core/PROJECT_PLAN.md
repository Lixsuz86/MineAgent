# Minecraft AI Companion — Proje Planı

Kullanıcının kendi karakterini (persona), LLM sağlayıcısını ve sesini
seçebildiği, açık kaynak, config-tabanlı bir Minecraft AI ajanı.

## 1. Hedef

- Kullanıcı Minecraft'a bağlanan bir bot çalıştırır.
- Bot, oyun durumunu algılar → bir LLM'e gönderir → LLM kararını
  oyun içi aksiyona çevirir → isteğe bağlı olarak sesli konuşur.
- Her şey (persona, LLM sağlayıcı, ses sağlayıcı, davranış hedefleri)
  bir config dosyasından geliyor. Kodda hiçbir şey hardcoded değil.
- Kullanıcının PC'sinde çalışır; yerel bir AI kurulumu **zorunlu
  değil** — ücretsiz bulut API'leri destekleniyor. İsteyen yerel
  modele de geçebilir (opsiyonel, zorunlu değil).

## 2. Genel Mimari

```
                ┌────────────────────┐
                │   config.json /    │
                │      .env          │  ← kullanıcı burayı düzenler
                └─────────┬──────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
 ┌─────────────┐  ┌───────────────┐  ┌──────────────┐
 │ Minecraft    │  │  Agent Loop   │  │  TTS Layer   │
 │ (Mineflayer) │◄─┤ perceive→think│─►│ (provider'a  │
 │              │  │   →act        │  │  göre)       │
 └──────┬───────┘  └───────┬───────┘  └──────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
  oyun durumu        LLM Provider        ses çıktısı
  (envanter, çevre)  (Groq / Gemini /    (hoparlör /
                       yerel opsiyonel)    dosya / stream)
```

İki taraf da **adapter pattern** ile soyutlanıyor: `LLMProvider` ve
`TTSProvider` birer interface, kullanıcı config'de hangisini
kullanacağını seçiyor, kod tarafında yeni sağlayıcı eklemek tek bir
dosya eklemek kadar kolay olacak.

## 3. Klasör Yapısı

```
mc-ai-agent/
├── config/
│   ├── config.example.json      # persona, provider seçimleri, görev tercihleri
│   └── personas/
│       └── example-persona.json # örnek karakter şablonu
├── src/
│   ├── llm/
│   │   ├── provider.js          # ortak interface: generate(messages) -> text
│   │   ├── groq.js
│   │   ├── gemini.js
│   │   └── local-ollama.js      # opsiyonel, ileri seviye kullanıcılar için
│   ├── tts/
│   │   ├── provider.js          # ortak interface: speak(text) -> audio buffer/stream
│   │   ├── elevenlabs.js        # ücretsiz kota ile
│   │   ├── piper.js             # tamamen yerel/ücretsiz
│   │   └── postprocess.js       # pitch/robo efekt (pydub benzeri, node tarafında)
│   ├── minecraft/
│   │   ├── bot.js               # mineflayer bağlantısı
│   │   ├── perception.js        # oyun durumu -> LLM'e uygun özet JSON
│   │   └── actions.js           # LLM çıktısı -> mineflayer komutları
│   ├── agent/
│   │   └── loop.js              # perceive -> think -> act -> speak döngüsü
│   └── index.js                 # giriş noktası, config'i okuyup her şeyi bağlar
├── .env.example
├── README.md
└── package.json
```

## 4. Sağlayıcı Seçenekleri (kullanıcı config'den seçer)

| Katman | Seçenek A | Seçenek B |
|---|---|---|
| LLM | **Groq** (ücretsiz, hızlı, Llama/Mixtral) | **Gemini API** (ücretsiz tier, Flash model) |
| TTS | **Piper** (tam yerel, kurulum gerektirir, tamamen ücretsiz) | **ElevenLabs** (bulut, ücretsiz kota sınırlı ama kurulumsuz) |

Video referansındaki yaklaşım (kayıt + ElevenLabs voice changer +
pitch/robo efekt) `tts/elevenlabs.js` + `tts/postprocess.js`
kombinasyonuyla karşılanıyor; kullanıcı isterse kendi ses klonunu da
ElevenLabs'e yükleyip persona'ya bağlayabilir.

## 5. Persona / Config Şeması (taslak)

```json
{
  "persona": {
    "name": "Cyn",
    "systemPrompt": "Sen meraklı, biraz tuhaf bir robot karaktersin...",
    "voiceId": "elevenlabs-voice-id-or-piper-model"
  },
  "llm": {
    "provider": "groq",
    "model": "llama-3.1-70b-versatile",
    "apiKey": "env:GROQ_API_KEY"
  },
  "tts": {
    "provider": "piper",
    "postprocess": { "pitchShift": -2, "roboEffect": true }
  },
  "behavior": {
    "goals": ["explore", "mine_wood", "respond_to_chat"],
    "reactToPlayers": true
  }
}
```

## 6. Aşamalı Yol Haritası

**Aşama 1 — İskelet ve LLM adapter**
- Repo yapısı, `package.json`, config yükleme
- `LLMProvider` interface + Groq ve Gemini implementasyonu
- Basit CLI testi: config'den persona okuyup metin tabanlı sohbet

**Aşama 2 — Minecraft entegrasyonu**
- Mineflayer bağlantısı, sunucuya login
- `perception.js`: envanter, yakın bloklar/entity'ler, sağlık,
  sohbet mesajlarını LLM'e uygun kısa JSON'a indirger
- `actions.js`: LLM'in döndürdüğü komutları (git, kaz, yerleştir,
  sohbete cevap ver) mineflayer fonksiyonlarına çevirir
- Agent loop: perceive → think (LLM) → act

**Aşama 3 — Ses katmanı**
- `TTSProvider` interface + Piper ve ElevenLabs implementasyonu
- `postprocess.js`: pitch shift + robotik efekt (opsiyonel)
- Agent loop'a `speak()` adımı eklenir (LLM cevabı → ses)

**Aşama 4 — Kullanılabilirlik (tamamlandı)**
- `config.example.json` + adım adım kurulum rehberi (README)
- Hata yönetimi: API kotası dolarsa / bağlantı koparsa nazik fallback
- Örnek personalar (3 tane) repo içinde hazır gelsin

**Aşama 5 — İyileştirme (kısmen tamamlandı)**
- Offline-mode skin özelleştirme — **tamamlandı**: `skin.js`,
  sunucudaki SkinRestorer/SkinChanger benzeri bir eklentiye komut
  gönderiyor (`config.skin.enabled/value/command`)
- Yerel LLM desteği (Ollama) ileri seviye kullanıcılar için
- Stream/overlay çıktısı (OBS için metin/ses gösterimi)
- Görev planlama derinliği (çoklu adım hedefler, hafıza)

## 7. Sıradaki Adım

Ana iskelet (Aşama 1-4) ve skin özelleştirme tamamlandı. Aşama 5'in
geri kalanı (Ollama desteği, OBS overlay, görev planlama) istenirse
sırayla eklenebilir.
