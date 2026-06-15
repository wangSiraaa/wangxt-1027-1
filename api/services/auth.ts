import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database.js';
import { JWTPayload, Role } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'contract-system-secret-key-2026';
const JWT_EXPIRES = '24h';

export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function login(role: Role, identifier: string, password: string): Promise<{ token: string; user: JWTPayload } | null> {
  let usernameField = 'username';
  let userSql = '';
  if (role === 'admin') {
    userSql = `SELECT id, username, password, role, ref_id, name FROM user WHERE username = ? AND role = 'admin' AND is_active = 1`;
  } else if (role === 'doctor') {
    userSql = `SELECT id, username, password, role, ref_id, name FROM user WHERE username = ? AND role = 'doctor' AND is_active = 1`;
  } else {
    userSql = `SELECT id, username, password, role, ref_id, name FROM user WHERE username = ? AND role = 'resident' AND is_active = 1`;
  }
  const user = queryOne<any>(userSql, [identifier]);
  if (!user) return null;

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return null;

  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
    refId: user.ref_id,
    name: user.name,
  };
  return { token: createToken(payload), user: payload };
}
