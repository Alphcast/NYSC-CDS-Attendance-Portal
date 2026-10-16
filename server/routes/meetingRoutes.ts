import { Router, Response } from 'express';
import { storage } from '../storage.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// List all CDS meetings
router.get('/', async (_req, res) => {
  try {
    const meetings = await storage.getMeetings();
    res.json({ meetings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new CDS meeting (Admin / Officer)
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'officer']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, cdsGroup, date, startTime, endTime, venue, agenda } = req.body;

      if (!title || !date || !venue) {
        res.status(400).json({ error: 'Title, Date, and Venue are required to create a CDS meeting.' });
        return;
      }

      const newMeeting = await storage.createMeeting(
        {
          title: title.trim(),
          cdsGroup: cdsGroup?.trim() || 'All',
          date: date.trim(),
          startTime: startTime?.trim() || '08:00',
          endTime: endTime?.trim() || '12:00',
          venue: venue.trim(),
          agenda: agenda?.trim() || '',
          isActive: true
        },
        req.user!
      );

      res.status(201).json({
        message: 'CDS meeting created successfully.',
        meeting: newMeeting
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
