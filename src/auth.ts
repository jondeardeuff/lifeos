import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'your-development-secret';
const JWT_EXPIRE = '7d';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateTokens = (
  userId: string,
): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d',
  });
  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): unknown => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};