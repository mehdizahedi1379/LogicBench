/**
 * Express Server with Vite middleware (development) and static asset serving (production)
 * Includes Gemini API Proxy Route (/api/gemini) and healthcheck
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint for Cloud Run container monitoring
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'LogicBench', timestamp: Date.now() });
  });

  // Gemini AI API Proxy Route
  app.post('/api/gemini', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
        return res.status(401).json({
          error: 'GEMINI_API_KEY is not configured on the server. Please add your Gemini API key in AI Studio Secrets.'
        });
      }

      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt in request body' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      const text = response.text || 'No response text generated.';
      return res.json({ text });
    } catch (err: any) {
      console.error('Gemini API Proxy Error:', err);
      return res.status(500).json({
        error: err?.message || 'Internal server error during Gemini inference'
      });
    }
  });

  const distDir = path.resolve(process.cwd(), 'dist');

  // If in production or running compiled server with dist existing
  if (isProduction || (!process.env.VITE_DEV_SERVER && fs.existsSync(path.join(distDir, 'index.html')) && process.env.NODE_ENV !== 'development')) {
    console.log(`[Server] Serving production static build from ${distDir}`);
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // Development mode with dynamic Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`LogicBench server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
