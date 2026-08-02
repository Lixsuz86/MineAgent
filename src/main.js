const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const CORE_DIR = path.join(__dirname, "..", "core");
// app.asar içi salt okunur — kişisel config'i yazılabilir userData
// dizinine koyuyoruz (Windows: %APPDATA%\MC AI Agent\config.json).
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const CONFIG_EXAMPLE_PATH = path.join(CORE_DIR, "config", "config.example.json");
const PERSONAS_DIR = path.join(CORE_DIR, "config", "personas");

let mainWindow;
let agentHandle = null; // çalışan agent'ı durdurmak için tutulur (bot referansı da içinde)
let voiceChatSession = null; // sesli sohbet oturumu (LLM konuşma geçmişi)
let voiceChatLLMProvider = null; // sesli sohbetin kendi LLM provider'ı

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 780,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  agentHandle?.stop();
  if (process.platform !== "darwin") app.quit();
});

// ---- Config okuma/yazma ----

ipcMain.handle("config:load", () => {
  const path_ = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE_PATH;
  const raw = fs.readFileSync(path_, "utf-8");
  return JSON.parse(raw);
});

ipcMain.handle("config:save", (_event, configObject) => {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configObject, null, 2), "utf-8");
  return { ok: true };
});

ipcMain.handle("personas:list", () => {
  if (!fs.existsSync(PERSONAS_DIR)) return [];
  return fs
    .readdirSync(PERSONAS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const content = JSON.parse(fs.readFileSync(path.join(PERSONAS_DIR, f), "utf-8"));
      return { file: f, ...content.persona };
    });
});

// ---- Agent kontrolü ----

ipcMain.handle("agent:start", async () => {
  if (agentHandle) {
    return { ok: false, error: "Agent zaten çalışıyor." };
  }

  try {
    // core/src ESM modülü; ana süreç CommonJS olduğu için dynamic import kullanıyoruz.
    const { startAgent } = await import(pathToFileUrl(path.join(CORE_DIR, "src", "agent-runner.js")));

    const config = loadCurrentConfig();

    agentHandle = await startAgent(config, {
      onLog: (line) => mainWindow?.webContents.send("agent:log", line),
      onWarn: (line) => mainWindow?.webContents.send("agent:log", `⚠ ${line}`),
      onFatalError: (err) => {
        mainWindow?.webContents.send("agent:fatal", err.message);
        agentHandle = null;
      },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("agent:stop", () => {
  if (!agentHandle) return { ok: false, error: "Agent zaten çalışmıyor." };
  agentHandle.stop();
  agentHandle = null;
  return { ok: true };
});

ipcMain.handle("agent:status", () => {
  return { running: agentHandle !== null };
});

ipcMain.handle("dialog:pickFile", async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ---- Sesli Sohbet ----
// Agent (Minecraft botu) çalışıyor olsun ya da olmasın kullanılabilir.
// Oyun bağlamı istenirse ve agent çalışıyorsa, agentHandle.bot üzerinden okunur.

ipcMain.handle("voiceChat:sendText", async (_event, { text, includeGameContext }) => {
  try {
    const config = loadCurrentConfig();

    if (!voiceChatSession) {
      const { createLLMProvider } = await import(
        pathToFileUrl(path.join(CORE_DIR, "src", "llm", "provider.js"))
      );
      const { VoiceChatSession } = await import(
        pathToFileUrl(path.join(CORE_DIR, "src", "voice-chat.js"))
      );

      voiceChatLLMProvider = await createLLMProvider(config.llm);
      voiceChatSession = new VoiceChatSession(voiceChatLLMProvider, config.persona);
    }

    const reply = await voiceChatSession.send(text, {
      bot: agentHandle?.bot || null,
      includeGameContext: !!includeGameContext,
    });

    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("voiceChat:clear", () => {
  voiceChatSession?.clear();
  return { ok: true };
});

ipcMain.handle("voiceChat:speak", async (_event, text) => {
  try {
    const config = loadCurrentConfig();
    const { createTTSProvider } = await import(
      pathToFileUrl(path.join(CORE_DIR, "src", "tts", "provider.js"))
    );
    const { applyPostProcessing } = await import(
      pathToFileUrl(path.join(CORE_DIR, "src", "tts", "postprocess.js"))
    );
    const { playAudio } = await import(
      pathToFileUrl(path.join(CORE_DIR, "src", "tts", "playback.js"))
    );

    const ttsProvider = await createTTSProvider(config.tts || {});
    if (!ttsProvider) return { ok: false, error: "Ses sağlayıcı kapalı (config: tts.provider = none)." };

    const rawAudio = await ttsProvider.speak(text);
    const processedAudio = await applyPostProcessing(rawAudio, {
      pitchShift: config.tts?.postprocess?.pitchShift ?? 0,
      roboEffect: config.tts?.postprocess?.roboEffect ?? false,
    });
    await playAudio(processedAudio);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("voiceChat:transcribe", async (_event, wavArrayBuffer) => {
  try {
    const config = loadCurrentConfig();
    const { transcribeWithWhisperCpp } = await import(
      pathToFileUrl(path.join(CORE_DIR, "src", "stt", "whisper-cpp.js"))
    );

    const buffer = Buffer.from(wavArrayBuffer);
    const text = await transcribeWithWhisperCpp(buffer, {
      executable: config.voiceChat?.whisperExecutable,
      modelPath: config.voiceChat?.whisperModelPath,
    });

    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("voiceChat:gameContextAvailable", () => {
  return { available: agentHandle?.bot != null };
});

function loadCurrentConfig() {
  const path_ = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE_PATH;
  return JSON.parse(fs.readFileSync(path_, "utf-8"));
}

function pathToFileUrl(p) {
  return require("node:url").pathToFileURL(p).href;
}
