import { Router, Response } from 'express';
import { storage } from '../storage.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. Corps Member Register for CDS & Create Attendance Record
router.post('/register-cds', async (req, res) => {
  try {
    const { fullName, stateCode, email, cdsGroup, phoneNumber, batch, ppa } = req.body;

    if (!fullName || !stateCode || !cdsGroup) {
      res.status(400).json({
        error: 'Full Name, NYSC State Code, and CDS Group are mandatory to register.'
      });
      return;
    }

    const cleanCode = stateCode.trim().toUpperCase();
    const cleanEmail = email?.trim() || `${cleanCode.replace(/\//g, '.').toLowerCase()}@nysc.gov.ng`;

    const result = await storage.registerCorpsMember({
      fullName: fullName.trim(),
      stateCode: cleanCode,
      email: cleanEmail,
      cdsGroup: cdsGroup.trim(),
      phoneNumber: phoneNumber?.trim() || '',
      batch: batch?.trim() || '2024 Batch B',
      ppa: ppa?.trim() || ''
    });

    res.status(201).json({
      message: `Registration Done! Attendance record created for ${result.user.fullName} in ${result.user.cdsGroup}.`,
      user: result.user,
      sheet: result.sheet
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to complete CDS registration.' });
  }
});

// 2. Get CDS Attendance Records with 100 Square Boxes split by CDS Group
router.get('/cds-records', async (req, res) => {
  try {
    const { cdsGroup, search } = req.query as { cdsGroup?: string; search?: string };
    const data = await storage.getCDSAttendanceRecords(cdsGroup, search);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Toggle / Mark a Meeting Box (1 to 100) for a Corps Member
router.post('/toggle-box', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stateCode, meetingNumber } = req.body;

    if (!stateCode || typeof meetingNumber !== 'number') {
      res.status(400).json({ error: 'stateCode and meetingNumber (1..100) are required.' });
      return;
    }

    // Identify actor (from token/header or default to Officer)
    const actor = req.user || {
      id: 'usr_officer_osun',
      fullName: 'CDS Verification Officer (Osogbo)',
      role: 'officer',
      stateCode: 'OS/24B/0088'
    };

    const result = await storage.toggleMeetingBox(stateCode, meetingNumber, actor);

    res.json({
      message: result.box.attended
        ? `Marked present for CDS Meeting #${meetingNumber} for ${result.member.fullName}.`
        : `Unmarked attendance for CDS Meeting #${meetingNumber}.`,
      member: result.member,
      box: result.box
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Submit Member Check-in (legacy / quick check-in)
router.post('/check-in', async (req, res) => {
  try {
    const { fullName, stateCode, cdsGroup, meetingDate, meetingId } = req.body;

    if (!fullName || !stateCode || !cdsGroup || !meetingDate) {
      res.status(400).json({
        error: 'Missing required check-in fields: Full Name, NYSC State Code, CDS Group, and Meeting Date are mandatory.'
      });
      return;
    }

    const cleanCode = stateCode.trim().toUpperCase();
    const cleanDate = meetingDate.trim();
    const cleanGroup = cdsGroup.trim();

    // Ensure member exists
    const registeredUser = await storage.findUserByStateCode(cleanCode);
    if (!registeredUser) {
      await storage.registerCorpsMember({
        fullName: fullName.trim(),
        stateCode: cleanCode,
        email: `${cleanCode.replace(/\//g, '.').toLowerCase()}@nysc.gov.ng`,
        cdsGroup: cleanGroup
      });
    }

    const newRecord = await storage.checkIn({
      fullName: fullName.trim(),
      stateCode: cleanCode,
      cdsGroup: cleanGroup,
      meetingDate: cleanDate,
      meetingId
    });

    res.status(201).json({
      message: 'Your check-in has been submitted successfully. Your attendance is pending approval by the CDS attendance officer.',
      attendance: newRecord
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Duplicate check-in rejected')) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message || 'Failed to submit check-in.' });
  }
});

// 5. Get Attendances with Search & Filters
router.get('/', async (req, res) => {
  try {
    const { meetingDate, cdsGroup, status, stateCode, search } = req.query as {
      meetingDate?: string;
      cdsGroup?: string;
      status?: string;
      stateCode?: string;
      search?: string;
    };

    const attendances = await storage.getAttendances({
      meetingDate,
      cdsGroup,
      status,
      stateCode,
      search
    });

    res.json({ attendances });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Attendance Summary Stats
router.get('/stats', async (req, res) => {
  try {
    const { meetingDate, cdsGroup } = req.query as { meetingDate?: string; cdsGroup?: string };
    const stats = await storage.getAttendanceStats(meetingDate, cdsGroup);
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Officer Approve Attendance
router.post(
  '/:id/approve',
  authenticateToken,
  requireRole(['officer', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const attendanceId = req.params.id;
      const { meetingNotes } = req.body;
      const officer = req.user!;

      const existingRecord = await storage.findAttendanceById(attendanceId);
      if (!existingRecord) {
        res.status(404).json({ error: 'Attendance record not found.' });
        return;
      }

      if (
        officer.stateCode &&
        existingRecord.stateCode &&
        officer.stateCode.trim().toUpperCase() === existingRecord.stateCode.trim().toUpperCase()
      ) {
        res.status(403).json({
          error: 'Self-approval forbidden: An attendance officer cannot approve their own attendance submission. Another officer or administrator must verify your presence.'
        });
        return;
      }

      const updated = await storage.approveAttendance(
        attendanceId,
        {
          id: officer.id,
          fullName: officer.fullName,
          role: officer.role,
          stateCode: officer.stateCode
        },
        meetingNotes
      );

      res.json({
        message: `Attendance for ${updated.fullName} (${updated.stateCode}) approved successfully.`,
        attendance: updated
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// 8. Officer Reject Attendance
router.post(
  '/:id/reject',
  authenticateToken,
  requireRole(['officer', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const attendanceId = req.params.id;
      const { rejectionReason } = req.body;
      const officer = req.user!;

      if (!rejectionReason || !rejectionReason.trim()) {
        res.status(400).json({ error: 'Please provide a reason for rejecting this attendance request.' });
        return;
      }

      const existingRecord = await storage.findAttendanceById(attendanceId);
      if (!existingRecord) {
        res.status(404).json({ error: 'Attendance record not found.' });
        return;
      }

      const updated = await storage.rejectAttendance(
        attendanceId,
        {
          id: officer.id,
          fullName: officer.fullName,
          role: officer.role,
          stateCode: officer.stateCode
        },
        rejectionReason.trim()
      );

      res.json({
        message: `Attendance for ${updated.fullName} (${updated.stateCode}) marked as Rejected.`,
        attendance: updated
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// 9. Export Attendance Record to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { meetingDate, cdsGroup, status } = req.query as {
      meetingDate?: string;
      cdsGroup?: string;
      status?: string;
    };

    const attendances = await storage.getAttendances({
      meetingDate,
      cdsGroup,
      status
    });

    const header = ['S/N', 'Full Name', 'State Code', 'CDS Group', 'Meeting Date', 'Check-In Time', 'Status', 'Approved By', 'Rejection Reason'];

    const rows = attendances.map((item, index) => {
      const timeStr = new Date(item.checkInTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const approvedByStr = item.approvedBy
        ? `${item.approvedBy.fullName} (${item.approvedBy.role})`
        : item.status === 'Approved'
          ? 'CDS Officer'
          : '—';

      const rejectionStr = item.rejectionReason ? `"${item.rejectionReason.replace(/"/g, '""')}"` : '—';

      return [
        index + 1,
        `"${item.fullName.replace(/"/g, '""')}"`,
        item.stateCode,
        `"${item.cdsGroup.replace(/"/g, '""')}"`,
        item.meetingDate,
        timeStr,
        item.status,
        `"${approvedByStr}"`,
        rejectionStr
      ].join(',');
    });

    const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\r\n');
    const filename = `NYSC_CDS_Attendance_Record_${meetingDate || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate attendance CSV export.' });
  }
});

export default router;
