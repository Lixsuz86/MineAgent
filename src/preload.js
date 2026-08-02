const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mcAgent", {
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  listPersonas: () => ipcRenderer.invoke("personas:list"),
  startAgent: () => ipcRenderer.invoke("agent:start"),
  stopAgent: () => ipcRenderer.invoke("agent:stop"),
  getStatus: () => ipcRenderer.invoke("agent:status"),
  pickFile: (filters) => ipcRenderer.invoke("dialog:pickFile", filters),
  onLog: (callback) => ipcRenderer.on("agent:log", (_e, line) => callback(line)),
  onFatal: (callback) => ipcRenderer.on("agent:fatal", (_e, message) => callback(message)),

  // Sesli sohbet
  voiceChatSendText: (text, includeGameContext) =>
    ipcRenderer.invoke("voiceChat:sendText", { text, includeGameContext }),
  voiceChatClear: () => ipcRenderer.invoke("voiceChat:clear"),
  voiceChatSpeak: (text) => ipcRenderer.invoke("voiceChat:speak", text),
  voiceChatTranscribe: (wavArrayBuffer) => ipcRenderer.invoke("voiceChat:transcribe", wavArrayBuffer),
  voiceChatGameContextAvailable: () => ipcRenderer.invoke("voiceChat:gameContextAvailable"),
});
