/**
 * AES-256-GCM encryption/decryption using Web Crypto API
 */

/**
 * Encrypt a message using AES-256-GCM
 * @param message - Plain text message to encrypt
 * @param key - 32-byte encryption key
 * @returns Encrypted data (IV + encrypted content) as Uint8Array
 */
export async function encryptMessage(
  message: string,
  key: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import key - Uint8Array is compatible with BufferSource
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    data
  );

  // Combine IV + encrypted content
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result;
}

/**
 * Decrypt a message using AES-256-GCM
 * @param encryptedData - Encrypted data (IV + encrypted content)
 * @param key - 32-byte decryption key
 * @returns Decrypted plain text message
 */
export async function decryptMessage(
  encryptedData: Uint8Array,
  key: Uint8Array
): Promise<string> {
  // Extract IV (first 12 bytes)
  const iv = encryptedData.slice(0, 12);
  const encrypted = encryptedData.slice(12);

  // Import key - Uint8Array is compatible with BufferSource
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a random 32-byte key for AES-256
 */
export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string or array to Uint8Array
 */
export function hexToUint8Array(hex: string | number[]): Uint8Array {
  if (Array.isArray(hex)) {
    return new Uint8Array(hex);
  }
  if (typeof hex !== "string") {
    throw new Error("Invalid input: expected string or array");
  }
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error("Invalid hex string");
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

