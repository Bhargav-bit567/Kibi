/* ============================================
   Kibi — Gemini AI proxy
   The browser sends a prompt; the server adds the API key (GEMINI_API_KEY) and
   forwards it to Gemini, so the key never reaches the client.
   ============================================ */

const express = require('express');
const config = require('../config');

const router = express.Router();

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_PROMPT_CHARS = 30000;
const MAX_OUTPUT_TOKENS = 8192;

// Simple per-IP limit so the public endpoint can't drain the API quota.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
  } else if (++entry.count > MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
  }
  next();
}

router.post('/generate', rateLimit, async (req, res) => {
  if (!config.geminiApiKey) {
    return res.status(503).json({ error: 'Kibi AI is not configured on the server.' });
  }

  const { prompt, temperature, maxOutputTokens } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A prompt is required.' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Prompt is too long.' });
  }

  const generationConfig = {
    temperature: Number.isFinite(temperature) ? Math.min(Math.max(temperature, 0), 2) : 0.4,
    maxOutputTokens: Number.isFinite(maxOutputTokens)
      ? Math.min(Math.max(Math.floor(maxOutputTokens), 1), MAX_OUTPUT_TOKENS)
      : 2048
  };

  try {
    res.json({ text: await generateText(prompt, generationConfig) });
  } catch (err) {
    console.error('Gemini request failed:', err.message);
    res.status(502).json({ error: 'The AI service returned an error.' });
  }
});

// Sends one prompt to Gemini and returns the reply text (throws on failure).
async function generateText(prompt, generationConfig) {
  const response = await fetch(`${GEMINI_URL}/${config.geminiModel}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 500)}`);
  }
  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

module.exports = { router, rateLimit, generateText };
