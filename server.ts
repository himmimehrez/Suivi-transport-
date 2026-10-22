import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRouter from './src/server/api.ts';
import { authMiddleware } from './src/middleware/auth.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Attach authentication middleware
  app.use(authMiddleware as any);

  // Mount API router
  app.use('/api', apiRouter);

  // Run initial seed if tables are empty
  try {
    await seedDatabaseIfEmpty();
  } catch (err) {
    console.warn('Initial seed check finished with notification:', err);
  }

  // In development, hook into Vite dev middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built dist files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TransLog Algérie server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
