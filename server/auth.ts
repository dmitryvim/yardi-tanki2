import { jwtDecrypt } from "jose";
import { hkdf } from "./hkdf.js";

interface TokenPayload {
  telegramId?: string;
  username?: string;
  name?: string;
}

const COOKIE_NAME = "authjs.session-token";
const SECURE_COOKIE_NAME = "__Secure-authjs.session-token";

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

async function deriveEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return await hkdf(
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64,
  );
}

export async function decryptSessionToken(
  cookieHeader: string | undefined,
): Promise<TokenPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);

  for (const cookieName of [SECURE_COOKIE_NAME, COOKIE_NAME]) {
    const token = cookies[cookieName];
    if (!token) continue;

    try {
      const key = await deriveEncryptionKey(secret, cookieName);
      const { payload } = await jwtDecrypt(token, key, {
        clockTolerance: 15,
      });

      return {
        telegramId: payload.telegramId as string | undefined,
        username: payload.username as string | undefined,
        name: payload.name as string | undefined,
      };
    } catch {
      // Try next cookie name
    }
  }

  return null;
}
