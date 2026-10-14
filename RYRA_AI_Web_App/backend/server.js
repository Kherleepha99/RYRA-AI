import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../public");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "16kb" }));
app.use(express.static(webRoot));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "RYRA AI" }));

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const language = req.body?.language === "ha" ? "ha" : "en";
  if (!message) return res.status(400).json({ error: "message is required" });
  if (message.length > 4000) return res.status(413).json({ error: "message is too long" });

  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!key || !model) {
    return res.status(503).json({ error: "AI_API_KEY da AI_MODEL ba a saita su a backend ba." });
  }

  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const system = language === "ha"
    ? "Kai ne RYRA AI, mataimakiyar murya mai taimako. Ka amsa da Hausa mai sauƙi, a taƙaice kuma cikin ladabi. Ka bayyana iyakokin fasaha da gaskiya. Kada ka yi ikirarin cewa ka yi kira ko aika saƙo idan ba a tabbatar da hakan ba. Kada ka nemi kalmomin sirri ko API keys."
    : "You are RYRA AI, a helpful voice assistant. Reply clearly and concisely. Be honest about technical limitations. Never claim you placed a call or sent a message unless the app confirms it. Never ask for passwords or API keys.";

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: message }],
        temperature: 0.5
      }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider returned status", upstream.status);
      return res.status(502).json({ error: "AI provider ya ƙi buƙatar. Duba model da saitin backend." });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return res.status(502).json({ error: "AI provider returned an empty response." });
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error("AI request failed:", err?.message || err);
    res.status(502).json({ error: "Ba a iya haɗuwa da AI provider ba." });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`RYRA AI web app running at http://localhost:${port}`));
