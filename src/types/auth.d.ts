declare module '../auth' {
  export function hashPassword(password: string): Promise<string>;
  export function verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  export function generateTokens(userId: string): { accessToken: string; refreshToken: string };
  export function verifyToken(token: string): unknown;
}