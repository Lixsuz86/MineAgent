import { TTSProvider } from "./provider.js";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

/**
 * ElevenLabs — bulut tabanlı TTS, ücretsiz kotası var, kurulum
 * gerektirmez. API key: https://elevenlabs.io adresinden alınır.
 *
 * Kendi ses klonunuzu (voice cloning) ElevenLabs panelinden
 * oluşturup `voiceId` alanına ID'sini yazarsanız, video referansındaki
 * gibi "kayıt + voice changer" yaklaşımını taklit edebilirsiniz.
 */
export class ElevenLabsProvider extends TTSProvider {
  constructor(config) {
    super(config);
    this.apiKey = resolveApiKey(config.apiKey);
    this.voiceId = config.voiceId;
    this.modelId = config.modelId || "eleven_multilingual_v2";

    if (!this.apiKey) {
      throw new Error(
        "ElevenLabs API key bulunamadı. .env dosyasına ELEVENLABS_API_KEY=... ekleyin " +
          "veya config.json içinde tts.apiKey alanını ayarlayın."
      );
    }

    if (!this.voiceId) {
      throw new Error(
        "config.json içinde tts.voiceId ayarlanmamış. ElevenLabs panelinden " +
          "bir ses seçip ID'sini buraya girin."
      );
    }
  }

  get name() {
    return "elevenlabs";
  }

  async speak(text) {
    const url = `${ELEVENLABS_API_URL}/${this.voiceId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: this.modelId,
        voice_settings: {
          stability: this.config.stability ?? 0.5,
          similarity_boost: this.config.similarityBoost ?? 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API hatası (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

function resolveApiKey(value) {
  if (!value) return process.env.ELEVENLABS_API_KEY;
  if (value.startsWith("env:")) {
    return process.env[value.slice(4)];
  }
  return value;
}
