import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT' | 'CARRIER' | 'DRIVER';
  companyId: number | null;
  phone?: string | null;
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  firebaseUser?: DecodedIdToken;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const demoUserUid = req.headers['x-demo-user-uid'] as string | undefined;

    // 1. If a demo user UID is passed (for role testing/switching)
    if (demoUserUid) {
      const matched = await db.select().from(users).where(eq(users.uid, demoUserUid)).limit(1);
      if (matched.length > 0) {
        req.user = matched[0] as AuthenticatedUser;
        return next();
      }
    }

    // 2. If Bearer token is provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.firebaseUser = decodedToken;

        // Find or link DB user
        let dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken.uid)).limit(1);
        if (dbUsers.length === 0 && decodedToken.email) {
          // Check by email
          dbUsers = await db.select().from(users).where(eq(users.email, decodedToken.email)).limit(1);
        }

        if (dbUsers.length > 0) {
          req.user = dbUsers[0] as AuthenticatedUser;
        } else {
          // Create new default client or admin user for this Firebase account
          const [newUser] = await db.insert(users).values({
            uid: decodedToken.uid,
            email: decodedToken.email || `user_${decodedToken.uid}@translog.dz`,
            name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Utilisateur',
            role: 'CLIENT',
            companyId: null,
            status: 'ACTIVE',
          }).returning();
          req.user = newUser as AuthenticatedUser;
        }
        return next();
      } catch (tokenErr) {
        console.warn('Firebase token verification error (fallback to session):', tokenErr);
      }
    }

    // 3. Fallback: anonymous or default demo user if available, or proceed without user
    return next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    next();
  }
};

export const requireRole = (allowedRoles: Array<'ADMIN' | 'CLIENT' | 'CARRIER' | 'DRIVER'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis: [${allowedRoles.join(', ')}], votre rôle: ${req.user.role}`,
      });
    }
    next();
  };
};
