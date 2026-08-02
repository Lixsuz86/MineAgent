let currentConfig = null;
let personas = [];

const el = (id) => document.getElementById(id);

async function init() {
  currentConfig = await window.mcAgent.loadConfig();
  personas = await window.mcAgent.listPersonas();

  renderPersonaPicker();
  fillFormFromConfig(currentConfig);
  bindToggleVisibility();
  bindActions();
  bindTabs();
  bindVoiceChat();

  window.mcAgent.onLog(appendLog);
  window.mcAgent.onFatal((message) => {
    appendLog(message, "fatal");
    setRunningState(false);
  });

  const status = await window.mcAgent.getStatus();
  setRunningState(status.running);
}

function bindTabs() {
  document.querySelectorAll("#tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      el("settings-tab").classList.toggle("hidden", tab !== "settings");
      el("voice-view").classList.toggle("visible", tab === "voice");
    });
  });
}

function renderPersonaPicker() {
  const picker = el("persona-picker");
  picker.innerHTML = "";

  personas.forEach((p) => {
    const chip = document.createElement("div");
    chip.className = "persona-chip";
    chip.textContent = p.name;
    chip.addEventListener("click", () => {
      el("persona-name").value = p.name;
      el("persona-prompt").value = p.systemPrompt;
      document.querySelectorAll(".persona-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
    picker.appendChild(chip);
  });
}

function fillFormFromConfig(config) {
  el("persona-name").value = config.persona?.name || "";
  el("persona-prompt").value = config.persona?.systemPrompt || "";

  el("llm-provider").value = config.llm?.provider || "groq";
  el("llm-apikey").value = resolveDisplayValue(config.llm?.apiKey);
  updateLlmKeyHint();

  el("mc-host").value = config.minecraft?.host || "localhost";
  el("mc-port").value = config.minecraft?.port || 25565;
  el("mc-username").value = config.minecraft?.username || "AIAgent";

  el("skin-enabled").checked = !!config.skin?.enabled;
  el("skin-value").value = config.skin?.value || "";

  el("tts-provider").value = config.tts?.provider || "none";
  el("piper-model-path").value = config.tts?.modelPath || "";
  el("elevenlabs-apikey").value = resolveDisplayValue(config.tts?.apiKey);
  el("elevenlabs-voiceid").value = config.tts?.voiceId || "";

  el("whisper-model-path").value = config.voiceChat?.whisperModelPath || "";
  el("whisper-executable").value = config.voiceChat?.whisperExecutable || "";

  updateSubfieldVisibility();
}

// config.json'da "env:GROQ_API_KEY" gibi bir referans olabilir; formda
// kullanıcıya boş bir alan gösterip düz metin girmesini bekliyoruz.
// Zaten düz bir key varsa onu gösteriyoruz.
function resolveDisplayValue(value) {
  if (!value || value.startsWith("env:")) return "";
  return value;
}

function updateLlmKeyHint() {
  const provider = el("llm-provider").value;
  const hint = el("llm-key-hint");
  if (provider === "groq") {
    hint.innerHTML = 'Ücretsiz anahtar: <a href="#" data-link="https://console.groq.com">console.groq.com</a>';
  } else {
    hint.innerHTML = 'Ücretsiz anahtar: <a href="#" data-link="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a>';
  }
}

function updateSubfieldVisibility() {
  el("skin-fields").classList.toggle("visible", el("skin-enabled").checked);

  const ttsProvider = el("tts-provider").value;
  el("piper-fields").classList.toggle("visible", ttsProvider === "piper");
  el("elevenlabs-fields").classList.toggle("visible", ttsProvider === "elevenlabs");
}

function bindToggleVisibility() {
  el("skin-enabled").addEventListener("change", updateSubfieldVisibility);
  el("tts-provider").addEventListener("change", updateSubfieldVisibility);
  el("llm-provider").addEventListener("change", updateLlmKeyHint);

  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
      e.preventDefault();
      window.open(link.dataset.link, "_blank");
    }
  });

  el("btn-pick-model").addEventListener("click", async () => {
    const path = await window.mcAgent.pickFile([{ name: "Piper Model", extensions: ["onnx"] }]);
    if (path) el("piper-model-path").value = path;
  });

  el("btn-pick-whisper-model").addEventListener("click", async () => {
    const path = await window.mcAgent.pickFile([{ name: "Whisper Model", extensions: ["bin"] }]);
    if (path) el("whisper-model-path").value = path;
  });
}

function buildConfigFromForm() {
  // Mevcut config'i temel alıyoruz ki formda göstermediğimiz alanlar
  // (örn. behavior.tickIntervalMs, tts.postprocess) kaybolmasın.
  const config = JSON.parse(JSON.stringify(currentConfig));

  config.persona = {
    name: el("persona-name").value.trim() || "AI Agent",
    systemPrompt: el("persona-prompt").value.trim(),
  };

  config.llm = {
    ...config.llm,
    provider: el("llm-provider").value,
    apiKey: el("llm-apikey").value.trim(),
  };

  config.minecraft = {
    ...config.minecraft,
    host: el("mc-host").value.trim() || "localhost",
    port: Number(el("mc-port").value) || 25565,
    username: el("mc-username").value.trim() || "AIAgent",
  };

  config.skin = {
    ...config.skin,
    enabled: el("skin-enabled").checked,
    value: el("skin-value").value.trim(),
  };

  config.tts = {
    ...config.tts,
    provider: el("tts-provider").value,
    modelPath: el("piper-model-path").value.trim(),
    apiKey: el("elevenlabs-apikey").value.trim(),
    voiceId: el("elevenlabs-voiceid").value.trim(),
  };

  config.voiceChat = {
    ...config.voiceChat,
    whisperModelPath: el("whisper-model-path").value.trim(),
    whisperExecutable: el("whisper-executable").value.trim() || "whisper-cli",
  };

  return config;
}

function bindActions() {
  el("btn-save").addEventListener("click", async () => {
    currentConfig = buildConfigFromForm();
    await window.mcAgent.saveConfig(currentConfig);
    const indicator = el("save-indicator");
    indicator.classList.add("show");
    setTimeout(() => indicator.classList.remove("show"), 1500);
  });

  el("btn-start").addEventListener("click", async () => {
    currentConfig = buildConfigFromForm();
    await window.mcAgent.saveConfig(currentConfig);

    el("btn-start").disabled = true;
    el("btn-start").textContent = "Başlatılıyor...";

    const result = await window.mcAgent.startAgent();

    el("btn-start").disabled = false;
    el("btn-start").textContent = "Başlat";

    if (!result.ok) {
      appendLog(result.error, "fatal");
      showConsole();
      return;
    }

    setRunningState(true);
    showConsole();
  });

  el("btn-stop").addEventListener("click", async () => {
    await window.mcAgent.stopAgent();
    setRunningState(false);
  });
}

function setRunningState(running) {
  const badge = el("status-badge");
  badge.textContent = running ? "çalışıyor" : "durduruldu";
  badge.classList.toggle("running", running);

  el("btn-start").style.display = running ? "none" : "inline-block";
  el("btn-stop").style.display = running ? "inline-block" : "none";
  el("btn-save").disabled = running;

  if (!running) hideConsole();
}

function showConsole() {
  el("view-form").style.display = "none";
  el("console").classList.add("visible");
}

function hideConsole() {
  el("view-form").style.display = "flex";
  el("console").classList.remove("visible");
}

function appendLog(text, kind) {
  const log = el("console-log");
  const line = document.createElement("div");
  line.className = "line" + (kind ? ` ${kind}` : text.startsWith("⚠") ? " warn" : "");
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ---- Sesli Sohbet ----

let mediaRecorder = null;
let recordedChunks = [];
let micState = "idle"; // "idle" | "listening" | "processing"

function bindVoiceChat() {
  const micButton = el("mic-button");
  const micMode = el("mic-mode");

  el("btn-clear-voice").addEventListener("click", async () => {
    await window.mcAgent.voiceChatClear();
    el("voice-transcript").innerHTML = '<div id="voice-empty">Geçmiş temizlendi.</div>';
  });

  // Tıkla-başlat/durdur modu
  micButton.addEventListener("click", () => {
    if (micMode.value !== "toggle") return;
    if (micState === "idle") startRecording();
    else if (micState === "listening") stopRecording();
  });

  // Basılı tut modu
  micButton.addEventListener("mousedown", () => {
    if (micMode.value !== "hold") return;
    if (micState === "idle") startRecording();
  });
  micButton.addEventListener("mouseup", () => {
    if (micMode.value !== "hold") return;
    if (micState === "listening") stopRecording();
  });
  micButton.addEventListener("mouseleave", () => {
    if (micMode.value !== "hold") return;
    if (micState === "listening") stopRecording();
  });

  micMode.addEventListener("change", updateMicHint);
  updateMicHint();
}

function updateMicHint() {
  const mode = el("mic-mode").value;
  el("mic-hint").textContent =
    mode === "toggle" ? "Konuşmak için tıkla, bitince tekrar tıkla" : "Basılı tutarak konuş, bırakınca gönderilir";
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      await handleRecordingComplete();
    };

    mediaRecorder.start();
    setMicState("listening");
  } catch (err) {
    addBubble(`Mikrofona erişilemedi: ${err.message}`, "system");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

async function handleRecordingComplete() {
  setMicState("processing");

  try {
    const webmBlob = new Blob(recordedChunks, { type: "audio/webm" });
    const wavBuffer = await convertToWav(webmBlob);

    const sttResult = await window.mcAgent.voiceChatTranscribe(wavBuffer);
    if (!sttResult.ok) {
      addBubble(`Ses tanıma başarısız: ${sttResult.error}`, "system");
      setMicState("idle");
      return;
    }

    const userText = sttResult.text?.trim();
    if (!userText) {
      addBubble("Bir şey anlaşılamadı, tekrar dener misin?", "system");
      setMicState("idle");
      return;
    }

    addBubble(userText, "user");

    const includeGameContext = el("voice-game-context").checked;
    const chatResult = await window.mcAgent.voiceChatSendText(userText, includeGameContext);

    if (!chatResult.ok) {
      addBubble(`Cevap alınamadı: ${chatResult.error}`, "system");
      setMicState("idle");
      return;
    }

    addBubble(chatResult.reply, "assistant");

    // Ses sağlayıcı ayarlıysa cevabı sesli oku (arka planda, engellemeden).
    window.mcAgent.voiceChatSpeak(chatResult.reply);
  } catch (err) {
    addBubble(`Hata: ${err.message}`, "system");
  } finally {
    setMicState("idle");
  }
}

function setMicState(state) {
  micState = state;
  const button = el("mic-button");
  button.classList.remove("listening", "processing");

  if (state === "listening") {
    button.classList.add("listening");
    button.textContent = "●";
  } else if (state === "processing") {
    button.classList.add("processing");
    button.textContent = "…";
  } else {
    button.textContent = "🎤";
  }
}

function addBubble(text, kind) {
  const emptyMsg = document.getElementById("voice-empty");
  if (emptyMsg) emptyMsg.remove();

  const transcript = el("voice-transcript");
  const bubble = document.createElement("div");
  bubble.className = `bubble ${kind}`;
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
}

/**
 * MediaRecorder'ın verdiği webm/opus ses verisini, whisper.cpp'nin
 * beklediği 16kHz mono WAV formatına çevirir. Web Audio API ile
 * decode edip elle WAV header yazıyoruz (ek bir kütüphane gerekmez).
 */
async function convertToWav(webmBlob) {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const samples = audioBuffer.getChannelData(0); // mono kabul ediyoruz
  const wavBuffer = encodeWav(samples, audioBuffer.sampleRate);

  audioContext.close();
  return wavBuffer;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

init();
