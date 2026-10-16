import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';

// Route imports
import authRoutes from './server/routes/authRoutes.js';
import attendanceRoutes from './server/routes/attendanceRoutes.js';
import meetingRoutes from './server/routes/meetingRoutes.js';
import memberRoutes from './server/routes/memberRoutes.js';
import auditRoutes from './server/routes/auditRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import testRoutes from './server/routes/testRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Initialize DB / Persistent storage
  await initDatabase();

  // Core Express middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/tests', testRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'NYSC CDS Attendance Management System',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString()
    });
  });

  // Supabase Status endpoint
  app.get('/api/supabase/status', async (_req, res) => {
    const { testSupabaseConnection, SUPABASE_CONFIG } = await import('./server/supabase.js');
    const status = await testSupabaseConnection();
    res.json({
      configured: true,
      url: SUPABASE_CONFIG.url,
      projectRef: SUPABASE_CONFIG.projectRef,
      status
    });
  });

  // Supabase Sync endpoint: pushes all current members, boxes, and attendances to Supabase
  app.post('/api/supabase/sync', async (_req, res) => {
    try {
      const { storage } = await import('./server/storage.js');
      const result = await storage.syncWithSupabase();
      res.json({
        message: 'Sync to Supabase completed successfully.',
        result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Supabase sync failed.' });
    }
  });

  // Supabase Pull endpoint: pulls all records from Supabase into memory cache
  app.post('/api/supabase/pull', async (_req, res) => {
    try {
      const { storage } = await import('./server/storage.js');
      const result = await storage.syncFromSupabase();
      res.json({
        message: 'Pulled latest records from Supabase successfully.',
        result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Supabase pull failed.' });
    }
  });

  // Supabase Schema endpoint: returns the complete SQL schema text
  app.get('/api/supabase/schema', async (_req, res) => {
    const { getSupabaseSchemaSQL } = await import('./server/supabase.js');
    res.type('text/plain').send(getSupabaseSchemaSQL());
  });

  // Frontend Integration
  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred.'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NYSC CDS Attendance System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
