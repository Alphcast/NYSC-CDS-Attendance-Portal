import { Router } from 'express';
import { storage } from '../storage.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Get Audit Logs (Protected to Officer and Admin)
router.get('/', authenticateToken, requireRole(['officer', 'admin']), async (_req, res) => {
  try {
    const logs = await storage.getAuditLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
