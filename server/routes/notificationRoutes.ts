import { Router } from 'express';
import { storage } from '../storage.js';

const router = Router();

// Get notifications for a stateCode
router.get('/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    const notifications = await storage.getNotifications(stateCode);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.markNotificationRead(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
