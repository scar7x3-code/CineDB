require('dotenv').config();
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app            = express();
const PORT           = process.env.PORT || 3000;
const API_KEY        = process.env.API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OMDB_URL       = 'https://www.omdbapi.com/';
const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT_PATH = path.join(__dirname, 'prompts', 'movie-assistant-system.md');
let MOVIE_ASSISTANT_PROMPT = '';

try {
  MOVIE_ASSISTANT_PROMPT = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8').trim();
} catch (err) {
  console.warn('CineDB: movie assistant prompt not loaded:', err.message);
}

if (!API_KEY || !String(API_KEY).trim()) {
  console.error('CineDB: API_KEY is missing. Add API_KEY to a .env file (see README).');
  process.exit(1);
}

/* ── Static files ─────────────────────────────────────── */
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ── OMDB helper ──────────────────────────────────────── */
async function omdbFetch(params) {
  const url = new URL(OMDB_URL);
  url.searchParams.set('apikey', API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDB responded with ${res.status}`);
  return res.json();
}

/* ── Routes ───────────────────────────────────────────── */

// Search: /api/search?q=batman&type=movie&page=1&year=2026
app.get('/api/search', async (req, res) => {
  const { q, type, page = '1', year } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

  try {
    const data = await omdbFetch({ s: q, type, page, y: year });
    res.json(data);
  } catch (err) {
    console.error('[/api/search]', err.message);
    res.status(500).json({ error: 'Failed to reach OMDB API.' });
  }
});

// Detail: /api/movie?id=tt0468569
app.get('/api/movie', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Query parameter "id" is required.' });

  try {
    const data = await omdbFetch({ i: id, plot: 'full' });
    res.json(data);
  } catch (err) {
    console.error('[/api/movie]', err.message);
    res.status(500).json({ error: 'Failed to reach OMDB API.' });
  }
});

// Chat: POST /api/chat  { messages: [{ role, content }] }
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_API_KEY || !String(GEMINI_API_KEY).trim()) {
    return res.status(503).json({ error: 'El asistente no está configurado (falta GEMINI_API_KEY).' });
  }
  if (!MOVIE_ASSISTANT_PROMPT) {
    return res.status(503).json({ error: 'El asistente no está configurado (falta el system prompt).' });
  }

  const raw = req.body?.messages;
  if (!Array.isArray(raw) || !raw.length) {
    return res.status(400).json({ error: 'Se requiere un historial de mensajes.' });
  }

  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.trim() }],
    }))
    .filter((m) => m.parts[0].text);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'El último mensaje debe ser del usuario.' });
  }
  if (messages.length > 40) {
    return res.status(400).json({ error: 'Demasiados mensajes en esta conversación.' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: MOVIE_ASSISTANT_PROMPT }] },
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      const msg = data?.error?.message || `Gemini respondió con ${geminiRes.status}`;
      console.error('[/api/chat]', msg);
      return res.status(502).json({ error: 'No pude generar una respuesta ahora.' });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!reply) {
      return res.status(502).json({ error: 'Respuesta vacía del modelo.' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ error: 'Error al contactar con el asistente.' });
  }
});

// Serve movie detail page for any /movie route (client-side reads ?id= param)
app.get('/movie', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'movie.html'));
});

/* ── Start ────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`🎬  CineDB is running → http://localhost:${PORT}`);
});
