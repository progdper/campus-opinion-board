const PASSWORD_HASH_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export type PasswordCredential = {
  hash: string;
  salt: string;
  iterations: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt).buffer,
      iterations,
    },
    passwordKey,
    HASH_BITS,
  );

  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

export async function createPasswordCredential(
  password: string,
): Promise<PasswordCredential> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(
    password,
    salt,
    PASSWORD_HASH_ITERATIONS,
  );

  return {
    hash: bytesToBase64(hash),
    salt: bytesToBase64(salt),
    iterations: PASSWORD_HASH_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  credential: PasswordCredential,
): Promise<boolean> {
  const expectedHash = base64ToBytes(credential.hash);
  const actualHash = await derivePasswordHash(
    password,
    base64ToBytes(credential.salt),
    credential.iterations,
  );

  return constantTimeEqual(actualHash, expectedHash);
}
