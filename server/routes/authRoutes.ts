import { Router, Response } from 'express';
import { storage } from '../storage.js';
import { authenticateToken, AuthenticatedRequest, generateToken } from '../middleware/auth.js';

const router = Router();

// Get current authenticated user
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// List demo personas for quick switching/testing
router.get('/personas', async (_req, res) => {
  const users = await storage.getUsers();
  const personas = users.map(u => ({
    id: u.id,
    fullName: u.fullName,
    stateCode: u.stateCode,
    email: u.email,
    role: u.role,
    cdsGroup: u.cdsGroup,
    batch: u.batch
  }));
  res.json({ personas });
});

// Quick switch persona for testing
router.post('/switch-persona', async (req, res) => {
  const { userId, stateCode } = req.body;
  let user;

  if (userId) {
    user = await storage.findUserById(userId);
  } else if (stateCode) {
    user = await storage.findUserByStateCode(stateCode);
  }

  if (!user) {
    res.status(404).json({ error: 'Selected persona not found.' });
    return;
  }

  const token = generateToken(user);
  res.json({
    message: `Switched active session to ${user.fullName} (${user.role.toUpperCase()})`,
    user,
    token
  });
});

// Login by Email or State Code
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier) {
    res.status(400).json({ error: 'Please provide your NYSC State Code or registered email.' });
    return;
  }

  const clean = identifier.trim();
  let user = await storage.findUserByStateCode(clean);
  if (!user) {
    user = await storage.findUserByEmail(clean);
  }

  if (!user) {
    res.status(401).json({ error: 'No corps member or officer found matching that state code or email.' });
    return;
  }

  // Generate JWT token
  const token = generateToken(user);
  res.json({
    message: 'Login successful.',
    user,
    token
  });
});

// Register new member
router.post('/register', async (req, res) => {
  const { fullName, stateCode, email, cdsGroup, phoneNumber, batch, ppa } = req.body;

  if (!fullName || !stateCode || !email || !cdsGroup) {
    res.status(400).json({ error: 'Full Name, State Code, Email, and CDS Group are required.' });
    return;
  }

  const stateCodeRegex = /^OS\/\d{2}[A-C]\/\d{3,5}$/i;
  const cleanCode = stateCode.trim().toUpperCase();

  if (!cleanCode.startsWith('OS/')) {
    res.status(400).json({
      error: 'Invalid NYSC State Code. State Code must start with OS/ for Osun State (e.g. OS/24B/1042).'
    });
    return;
  }

  if (!stateCodeRegex.test(cleanCode)) {
    res.status(400).json({
      error: 'Invalid NYSC State Code format. Expected format: OS/ Batch & Stream / Digits (e.g. OS/24B/1042).'
    });
    return;
  }

  try {
    const newUser = await storage.createUser({
      fullName: fullName.trim(),
      stateCode: cleanCode,
      email: email.trim().toLowerCase(),
      role: 'member',
      cdsGroup: cdsGroup.trim(),
      phoneNumber: phoneNumber?.trim() || '',
      batch: batch?.trim() || '2024 Batch B',
      ppa: ppa?.trim() || '',
      isVerified: true
    });

    const token = generateToken(newUser);
    res.status(201).json({
      message: 'Corps member registration successful.',
      user: newUser,
      token
    });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// Reset demo data
router.post('/reset-demo', async (_req, res) => {
  storage.resetDemoData();
  res.json({ message: 'Demo database reset to default state successfully.' });
});

export default router;
