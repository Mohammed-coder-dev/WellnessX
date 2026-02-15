import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "200kb" }));
app.use(express.static(".")); // serves index.html + app.js from current folder

app.post("/api/chat", async (req, res) => {
  try {
    const { mood, message, history } = req.body || {};

    if (!mood || typeof message !== "string") {
      return res.status(400).json({ error: "Missing mood or message" });
    }

    // Basic crisis detection (hackathon-grade, not clinical)
    const crisisRegex =
      /\b(suicide|kill myself|end it|self harm|hurt myself|want to die|can't go on|take my life)\b/i;

    if (crisisRegex.test(message)) {
      return res.status(200).json({
        reply:
          "I’m really sorry you’re feeling this way. You deserve immediate support from a real person. If you’re in the U.S., call or text **988**. If you’re in immediate danger, call **911**. If you’re outside the U.S., contact your local emergency number or a trusted person nearby right now.",
        crisis: true
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY in .env" });
    }

    const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];

    const system = `
You are MindfulAI, a supportive mental wellness coach (not a therapist).
Goals:
- Validate feelings briefly.
- Ask one gentle question to clarify.
- Offer one practical next step tailored to mood.
Rules:
- Do NOT diagnose conditions.
- Do NOT give medical/legal instructions.
- If user mentions self-harm/suicide, urge contacting local emergency resources immediately.
Style: warm, concise, 3-6 sentences.
`.trim();

    const userContent = `Mood: ${mood}\nUser message: ${message}`;

    const payload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 220,
      system,
      messages: [...trimmedHistory, { role: "user", content: userContent }]
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Anthropic API error",
        details: data
      });
    }

    const reply = data?.content?.[0]?.text || "I’m here with you. Tell me a bit more.";
    return res.status(200).json({ reply, crisis: false });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`MindfulAI running at http://localhost:${PORT}`);
});
