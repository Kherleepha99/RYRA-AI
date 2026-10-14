const $ = (id) => document.getElementById(id);
const language = $("language");
const form = $("chatForm");
const input = $("messageInput");
const welcome = $("welcome");
const conversation = $("conversation");
const micButton = $("micButton");
const listeningBanner = $("listeningBanner");
const listeningText = $("listeningText");
const toast = $("toast");
let recognition = null;
let isListening = false;
let assistantEnabled = false;
let waitingForWakeWord = true;
let toastTimer = null;
let restartTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function isHausa() { return language.value === "ha"; }
function updateLanguageUI() {
  input.placeholder = isHausa() ? "Rubuta wa RYRA ko danna makirufo…" : "Message RYRA or tap the microphone…";
  $("welcomeText").textContent = isHausa()
    ? "Yi magana da ni da Hausa ko Turanci. Yi tambaya ko gwada wani aiki."
    : "Talk to me in Hausa or English. Ask a question or try a quick action.";
  listeningText.textContent = isHausa() ? "Ina sauraro…" : "Listening…";
}
language.addEventListener("change", updateLanguageUI);
updateLanguageUI();

function addMessage(role, text, pending = false) {
  welcome.classList.add("hidden");
  conversation.classList.remove("hidden");
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "YOU" : "R";
  const body = document.createElement("div");
  body.className = "bubble";
  if (pending) body.classList.add("typing");
  body.textContent = text;
  row.append(avatar, body);
  conversation.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return { row, body };
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    showToast(isHausa() ? "Wannan browser ba ya tallafa wa amsa da murya." : "Speech output is not supported by this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = isHausa() ? "ha-NG" : "en-US";
  utterance.rate = 1;
  utterance.onstart = () => { if (assistantEnabled && recognition && isListening) { try { recognition.stop(); } catch {} } };
  utterance.onend = () => { if (assistantEnabled) { waitingForWakeWord = true; scheduleRecognitionRestart(); } };
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.toLowerCase() === utterance.lang.toLowerCase())
    || voices.find(v => v.lang.toLowerCase().startsWith(isHausa() ? "ha" : "en"));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

async function sendMessage(raw) {
  const message = raw.trim();
  if (!message) return;
  input.value = "";
  input.style.height = "auto";
  addMessage("user", message);
  const pending = addMessage("assistant", isHausa() ? "RYRA na tunani…" : "RYRA is thinking…", true);
  $("sendButton").disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language: language.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    pending.body.classList.remove("typing");
    pending.body.textContent = data.reply;
    const tools = document.createElement("div");
    tools.className = "message-tools";
    const speakButton = document.createElement("button");
    speakButton.className = "mini-tool";
    speakButton.textContent = isHausa() ? "🔊 Saurara" : "🔊 Speak";
    speakButton.addEventListener("click", () => speak(data.reply));
    const copyButton = document.createElement("button");
    copyButton.className = "mini-tool";
    copyButton.textContent = isHausa() ? "Kwafi" : "Copy";
    copyButton.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(data.reply); showToast(isHausa() ? "An kwafi amsar." : "Reply copied."); }
      catch { showToast(isHausa() ? "Ba a iya kwafa ba." : "Could not copy."); }
    });
    tools.append(speakButton, copyButton);
    pending.row.querySelector(".bubble").appendChild(tools);
    speak(data.reply);
  } catch (err) {
    pending.body.classList.remove("typing");
    pending.body.textContent = (isHausa() ? "Kuskure: " : "Error: ") + err.message;
  } finally {
    $("sendButton").disabled = false;
    input.focus();
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => sendMessage(button.dataset.prompt)));

function quickAction(action) {
  const urls = {
    whatsapp: "https://wa.me/",
    facebook: "https://www.facebook.com/",
    youtube: "https://www.youtube.com/",
    dial: "tel:"
  };
  if (action === "dial") {
    window.location.href = "tel:";
    showToast(isHausa() ? "An buɗe dialer idan na'urarka ta goyi baya." : "Opening the phone dialer if supported.");
  } else {
    window.open(urls[action], "_blank", "noopener,noreferrer");
    showToast(isHausa() ? "Ana buɗe app ko shafin yanar gizo." : "Opening app or website.");
  }
}
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => quickAction(button.dataset.action)));

$("newChat").addEventListener("click", () => {
  conversation.innerHTML = "";
  conversation.classList.add("hidden");
  welcome.classList.remove("hidden");
  window.speechSynthesis?.cancel();
  input.value = "";
});

function updateVoiceStatus() {
  micButton.classList.toggle("listening", assistantEnabled && isListening);
  micButton.setAttribute("aria-pressed", String(assistantEnabled));
  micButton.title = assistantEnabled
    ? (isHausa() ? "Kashe RYRA" : "Turn RYRA off")
    : (isHausa() ? "Fara mataimakin murya" : "Start voice assistant");
  listeningBanner.classList.toggle("hidden", !assistantEnabled);
  listeningText.textContent = !assistantEnabled
    ? (isHausa() ? "Mataimakin murya a kashe" : "Voice assistant is off")
    : (waitingForWakeWord
      ? (isHausa() ? 'Ina sauraro. Ka ce "Hey RYRA".' : 'Listening. Say "Hey RYRA".')
      : (isHausa() ? "Na ji ka. Fadi umarninka…" : "I'm listening. Say your command…"));
}
function scheduleRecognitionRestart() {
  clearTimeout(restartTimer);
  if (!assistantEnabled) return;
  restartTimer = setTimeout(() => startRecognitionSession(), 450);
}
function startRecognitionSession() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!assistantEnabled || !SpeechRecognition || isListening) return;
  recognition = new SpeechRecognition();
  recognition.lang = isHausa() ? "ha-NG" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;
  recognition.onstart = () => { isListening = true; updateVoiceStatus(); };
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (!event.results[i].isFinal) continue;
      const transcript = event.results[i][0].transcript.trim();
      if (!transcript) continue;
      const normalized = transcript.toLowerCase().replace(/[.,!?،؛:]/g, " ").replace(/\s+/g, " ").trim();
      if (waitingForWakeWord) {
        if (/\b(hey|hi)\s+(ryra|raira|rira)\b/.test(normalized) || /\b(hey|hi)\s+ai\b/.test(normalized)) {
          waitingForWakeWord = false;
          updateVoiceStatus();
          showToast(isHausa() ? "Na ji ka. Fadi abin da kake so." : "I'm listening. What can I do for you?");
        }
      } else {
        waitingForWakeWord = true;
        updateVoiceStatus();
        try { recognition.stop(); } catch {}
        sendMessage(transcript);
        return;
      }
    }
  };
  recognition.onerror = (event) => {
    isListening = false;
    updateVoiceStatus();
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      assistantEnabled = false;
      updateVoiceStatus();
      showToast(isHausa() ? "Ka ba browser izinin microphone." : "Please allow microphone access in your browser.");
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      showToast((isHausa() ? "Kuskuren murya: " : "Voice error: ") + event.error);
    }
  };
  recognition.onend = () => {
    isListening = false;
    updateVoiceStatus();
    if (assistantEnabled) scheduleRecognitionRestart();
  };
  try { recognition.start(); }
  catch { isListening = false; scheduleRecognitionRestart(); }
}
function stopListening() {
  assistantEnabled = false;
  isListening = false;
  clearTimeout(restartTimer);
  if (recognition) { recognition.onend = null; try { recognition.stop(); } catch {} }
  recognition = null;
  window.speechSynthesis?.cancel();
  updateVoiceStatus();
}
function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast(isHausa()
      ? "Browser ɗinka ba ya tallafa wa speech recognition. Gwada Chrome ko rubuta saƙo."
      : "Speech recognition is not supported here. Try Chrome or type your message.");
    return;
  }
  if (assistantEnabled) { stopListening(); return; }
  assistantEnabled = true;
  waitingForWakeWord = true;
  updateVoiceStatus();
  startRecognitionSession();
}
micButton.addEventListener("click", startListening);
$("cancelListen").addEventListener("click", stopListening);
