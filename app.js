let currentMood = null;
let conversationHistory = [];
let isListening = false;

const STORAGE_KEY = "mindful_sessions_v1";

function selectMood(mood, emoji) {
  currentMood = mood;

  document.getElementById("moodSection").classList.add("hidden");
  document.getElementById("chatSection").classList.remove("hidden");

  addMessage("ai", `I see you're feeling ${mood} today ${emoji}. I’m here with you. What’s on your mind?`);

  logSessionEvent({ type: "mood", mood, at: Date.now() });

  conversationHistory.push({ role: "user", content: `Mood selected: ${mood}` });
}

function addMessage(sender, text) {
  const messagesDiv = document.getElementById("chatMessages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `mb-4 ${sender === "user" ? "text-right" : "text-left"} fade-in`;

  messageDiv.innerHTML = `
    <div class="inline-block px-4 py-3 rounded-2xl ${
      sender === "user" ? "bg-white text-purple-600" : "bg-purple-500/30 text-white"
    } max-w-xs">
      ${escapeHtml(text)}
    </div>
  `;

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (!message) return;

  addMessage("user", message);
  input.value = "";

  logSessionEvent({ type: "msg", role: "user", mood: currentMood, at: Date.now(), len: message.length });

  conversationHistory.push({ role: "user", content: message });

  showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: currentMood, message, history: conversationHistory }),
    });

    const data = await response.json();
    removeTyping();

    if (!response.ok) {
      addMessage("ai", "I hit a server error. Try again in a moment.");
      return;
    }

    addMessage("ai", data.reply);
    conversationHistory.push({ role: "assistant", content: data.reply });

    logSessionEvent({ type: "msg", role: "ai", mood: currentMood, at: Date.now(), len: String(data.reply).length });

    const userMsgCount = getSessionEvents().filter(e => e.type === "msg" && e.role === "user").length;
    if (userMsgCount >= 4) {
      setTimeout(showInsights, 1200);
    }
  } catch (e) {
    removeTyping();
    addMessage("ai", "I’m here with you. Tell me a bit more about what’s going on.");
  }
}

function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.id = "typing";
  typingDiv.className = "mb-4 text-left fade-in";
  typingDiv.innerHTML = `
    <div class="inline-block px-4 py-3 rounded-2xl bg-purple-500/30 text-white">
      <span class="inline-block w-2 h-2 bg-white rounded-full animate-bounce mr-1"></span>
      <span class="inline-block w-2 h-2 bg-white rounded-full animate-bounce mr-1" style="animation-delay: 0.2s"></span>
      <span class="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
    </div>
  `;
  document.getElementById("chatMessages").appendChild(typingDiv);
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

/* ---------- Local analytics storage ---------- */

function getSessionEvents() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function logSessionEvent(evt) {
  const events = getSessionEvents();
  events.push(evt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  // soft reset UI
  startNewSession();
  document.getElementById("moodTrend").textContent = "📊 Not enough data";
  document.getElementById("streak").textContent = "0 days";
  document.getElementById("recommendations").innerHTML = "";
}

/* ---------- Insights ---------- */

function showInsights() {
  document.getElementById("chatSection").classList.add("hidden");
  document.getElementById("insightsSection").classList.remove("hidden");

  const events = getSessionEvents();
  const last7d = events.filter(e => e.at >= Date.now() - 7 * 24 * 60 * 60 * 1000);

  // streak: consecutive days with a mood event
  const daysWithMood = new Set(
    last7d
      .filter(e => e.type === "mood")
      .map(e => new Date(e.at).toISOString().slice(0, 10))
  );
  const streak = computeStreak(daysWithMood);
  document.getElementById("streak").textContent = `${streak} day${streak === 1 ? "" : "s"}`;

  // mood trend: simple scoring
  const moodScore = { amazing: 5, good: 4, okay: 3, down: 2, anxious: 2 };
  const moodEvents = last7d.filter(e => e.type === "mood");
  const scores = moodEvents.map(e => moodScore[e.mood] || 3);
  document.getElementById("moodTrend").textContent = computeTrend(scores);

  // recommendations: rule-based
  const recs = buildRecommendations(last7d);
  const recsDiv = document.getElementById("recommendations");
  recsDiv.innerHTML = recs.map(rec => `
    <div class="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
      <div class="text-2xl">${rec.icon}</div>
      <div class="flex-1">
        <div class="text-white font-semibold">${escapeHtml(rec.title)}</div>
        <div class="text-purple-200 text-sm">${escapeHtml(rec.desc)}</div>
      </div>
      <button class="text-white hover:text-purple-200">→</button>
    </div>
  `).join("");
}

function computeStreak(daysSet) {
  let streak = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (daysSet.has(d)) streak++;
    else break;
  }
  return streak;
}

function computeTrend(scores) {
  if (scores.length < 2) return "📊 Not enough data";
  const mid = Math.floor(scores.length / 2);
  const first = avg(scores.slice(0, mid));
  const last = avg(scores.slice(mid));
  if (last > first + 0.3) return "📈 Improving";
  if (last < first - 0.3) return "📉 Slipping";
  return "➖ Stable";
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildRecommendations(last7d) {
  const moodEvents = last7d.filter(e => e.type === "mood");
  const counts = moodEvents.reduce((acc, e) => {
    acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});

  const recs = [];

  if ((counts.anxious || 0) + (counts.down || 0) >= 2) {
    recs.push({
      icon: "🫁",
      title: "2-minute breathing reset",
      desc: "Inhale 4, hold 2, exhale 6. Repeat 6 cycles to downshift stress."
    });
  }

  recs.push({
    icon: "📝",
    title: "One-line journal prompt",
    desc: "Write: “The main thing weighing on me is…”. Stop after one sentence."
  });

  recs.push({
    icon: "🚶‍♂️",
    title: "10-minute walk, no phone",
    desc: "Short movement breaks reliably improve mood regulation."
  });

  recs.push({
    icon: "🌙",
    title: "Sleep guardrail",
    desc: "Pick a hard stop time tonight. Consistency beats intensity."
  });

  return recs.slice(0, 4);
}

/* ---------- Voice demo (simulated) ---------- */

function toggleVoice() {
  isListening = !isListening;
  const btn = document.getElementById("voiceBtn");

  if (isListening) {
    btn.classList.add("pulse-ring", "bg-red-500", "text-white");
    btn.classList.remove("bg-white", "text-purple-600");
    setTimeout(() => {
      toggleVoice();
      document.getElementById("messageInput").value = "I've been feeling overwhelmed lately...";
    }, 1800);
  } else {
    btn.classList.remove("pulse-ring", "bg-red-500", "text-white");
    btn.classList.add("bg-white", "text-purple-600");
  }
}

/* ---------- Reset flow ---------- */

function startNewSession() {
  document.getElementById("insightsSection").classList.add("hidden");
  document.getElementById("moodSection").classList.remove("hidden");
  document.getElementById("chatMessages").innerHTML = "";
  conversationHistory = [];
  currentMood = null;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});
