import crypto from "node:crypto";

export function hkdf(
  secret: string,
  salt: string,
  info: string,
  keyLength: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    crypto.hkdf(
      "sha256",
      secret,
      salt,
      info,
      keyLength,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(new Uint8Array(derivedKey));
      },
    );
  });
}
