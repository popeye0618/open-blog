import { jwtVerify, SignJWT } from 'jose';

export type OwnerSession = { email: string };

const TOKEN_COOKIE = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export async function getOwnerSession(
  request: Request,
  env: Env,
): Promise<OwnerSession | null> {
  if (env.AUTH_MODE === 'password') {
    const secret = env.JWT_SECRET;

    if (!secret) {
      return null;
    }

    const token = getCookie(request.headers.get('Cookie') ?? '', TOKEN_COOKIE);

    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(token, secretBytes(secret));

      if (payload.sub !== 'owner') {
        return null;
      }

      return { email: env.OWNER_EMAIL ?? 'owner' };
    } catch {
      return null;
    }
  }

  const expected = env.OWNER_EMAIL?.trim().toLowerCase();
  const email = request.headers.get('Cf-Access-Authenticated-User-Email')?.trim().toLowerCase();

  if (!expected || !email || email !== expected) {
    return null;
  }

  return { email };
}

export async function verifyAdminPassword(plain: string, env: Env): Promise<boolean> {
  const parsed = parsePasswordHash(env.ADMIN_PASSWORD_HASH);

  if (!parsed) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(plain),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: parsed.salt,
        iterations: parsed.iterations,
        hash: 'SHA-256',
      },
      key,
      parsed.hash.byteLength * 8,
    );

    return timingSafeEqual(new Uint8Array(derived), parsed.hash);
  } catch {
    return false;
  }
}

export async function issueAdminToken(env: Env): Promise<string> {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return new SignJWT({ sub: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secretBytes(env.JWT_SECRET));
}

export function buildAdminCookieHeader(token: string): string {
  return `${TOKEN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TOKEN_MAX_AGE}`;
}

export function buildAdminClearCookieHeader(): string {
  return `${TOKEN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function getCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');

    if (rawKey === name) {
      return rest.join('=');
    }
  }

  return null;
}

function parsePasswordHash(value?: string): {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
} | null {
  const parts = value?.split('$');

  if (!parts || parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return null;
  }

  const iterations = Number(parts[1]);

  if (!Number.isInteger(iterations) || iterations < 1) {
    return null;
  }

  return {
    iterations,
    salt: base64ToBytes(parts[2]),
    hash: base64ToBytes(parts[3]),
  };
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.byteLength; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}
