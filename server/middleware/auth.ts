import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage.js';
import { IUser, UserRole } from '../types.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'nysc-cds-attendance-secret-key-2026';

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      stateCode: user.stateCode,
      role: user.role,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Also support X-User-Id header for fast demo switching/testing
  const explicitUserId = req.headers['x-user-id'] as string;
  if (explicitUserId) {
    const user = await storage.findUserById(explicitUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  if (!token) {
    // Check cookie fallback if present
    const cookieToken = req.headers.cookie
      ?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; stateCode: string; role: UserRole };
    const user = await storage.findUserById(decoded.id) || await storage.findUserByStateCode(decoded.stateCode);

    if (!user) {
      res.status(401).json({ error: 'User session invalid or user not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Authorized roles for this action: ${allowedRoles.join(', ')}. Your role is: ${req.user.role}.`
      });
      return;
    }

    next();
  };
}
