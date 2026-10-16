import { Router, Response } from 'express';
import { storage } from '../storage.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// List registered corps members
router.get('/', async (_req, res) => {
  try {
    const users = await storage.getUsers();
    // Exclude password hashes if any
    const members = users.map(({ passwordHash, ...rest }) => rest);
    res.json({ members });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Sample Template Download
router.get('/csv-template', (_req, res) => {
  const csvContent =
    'FullName,StateCode,Email,CDSGroup,PhoneNumber,Batch,PPA\r\n' +
    'Adeyemi Tunde,OS/24B/1001,tunde.a@nysc.gov.ng,Editorial & Publicity,+2348031112222,2024 Batch B Stream 1,Osun State High Court Osogbo\r\n' +
    'Oladipo Blessing,OS/24B/1002,blessing.o@nysc.gov.ng,ICT & Digital Skills,+2348023334444,2024 Batch B Stream 1,Osun State Poly Iree\r\n' +
    'Adewale Samuel,OS/24B/1003,samuel.a@nysc.gov.ng,FRSC Road Safety,+2348057778888,2024 Batch B Stream 1,Federal Polytechnic Ede\r\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="NYSC_Corps_Members_Template.csv"');
  res.send(csvContent);
});

// Bulk Import Members via CSV
router.post(
  '/import-csv',
  authenticateToken,
  requireRole(['admin', 'officer']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { csvText } = req.body;

      if (!csvText || typeof csvText !== 'string') {
        res.status(400).json({ error: 'Please provide CSV content in the request body.' });
        return;
      }

      const lines = csvText
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV file must have a header row and at least one member data row.' });
        return;
      }

      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s_]/g, ''));
      const fullNameIdx = header.findIndex(h => h.includes('fullname') || h.includes('name'));
      const stateCodeIdx = header.findIndex(h => h.includes('statecode') || h.includes('code'));
      const emailIdx = header.findIndex(h => h.includes('email'));
      const cdsGroupIdx = header.findIndex(h => h.includes('cdsgroup') || h.includes('group') || h.includes('cds'));
      const phoneIdx = header.findIndex(h => h.includes('phone'));
      const batchIdx = header.findIndex(h => h.includes('batch'));
      const ppaIdx = header.findIndex(h => h.includes('ppa'));

      if (fullNameIdx === -1 || stateCodeIdx === -1) {
        res.status(400).json({
          error: 'CSV must include "FullName" and "StateCode" columns.'
        });
        return;
      }

      const membersToImport = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple comma split handling quotes
        const rawLine = lines[i];
        const cols = rawLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

        const fullName = cols[fullNameIdx];
        const stateCode = cols[stateCodeIdx];

        if (!fullName || !stateCode) continue;

        const email = emailIdx !== -1 && cols[emailIdx]
          ? cols[emailIdx]
          : `${stateCode.replace(/\//g, '.').toLowerCase()}@nysc.gov.ng`;

        const cdsGroup = cdsGroupIdx !== -1 && cols[cdsGroupIdx] ? cols[cdsGroupIdx] : 'Editorial & Publicity';
        const phoneNumber = phoneIdx !== -1 ? cols[phoneIdx] : '';
        const batch = batchIdx !== -1 ? cols[batchIdx] : '2024 Batch B';
        const ppa = ppaIdx !== -1 ? cols[ppaIdx] : '';

        membersToImport.push({
          fullName,
          stateCode: stateCode.toUpperCase(),
          email,
          cdsGroup,
          phoneNumber,
          batch,
          ppa,
          role: 'member' as const,
          isVerified: true
        });
      }

      const result = await storage.bulkAddMembers(membersToImport);

      // Audit log
      await storage.createAuditLog({
        action: 'MEMBERS_IMPORTED_CSV',
        performedBy: {
          id: req.user!.id,
          fullName: req.user!.fullName,
          role: req.user!.role,
          stateCode: req.user!.stateCode
        },
        details: `Imported ${result.added} corps members via CSV. Skipped ${result.skipped} existing/duplicate records.`
      });

      res.json({
        message: `Successfully processed CSV: ${result.added} corps members added, ${result.skipped} skipped (already registered).`,
        result
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
