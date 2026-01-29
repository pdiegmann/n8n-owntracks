import sodium from 'libsodium-wrappers';

/**
 * Decrypt OwnTracks encrypted payload
 * OwnTracks uses libsodium secretbox (XSalsa20-Poly1305)
 */
export async function decryptPayload(encryptedData: string, key: string): Promise<any> {
  try {
    await sodium.ready;

    const buffer = Buffer.from(encryptedData, 'base64');
    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;

    if (buffer.length <= nonceLength) {
      throw new Error('Encrypted payload is too short');
    }

    const nonce = buffer.subarray(0, nonceLength);
    const encrypted = buffer.subarray(nonceLength);

    const keyBuffer = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
    Buffer.from(key, 'utf8').copy(keyBuffer, 0, 0, keyBuffer.length);

    const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, keyBuffer);

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return JSON.parse(Buffer.from(decrypted).toString('utf8'));
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if payload is encrypted (base64 check)
 */
export function isEncrypted(data: string): boolean {
  // Basic check - OwnTracks encrypted payloads are base64 strings without { at start
  return !data.trim().startsWith('{') && /^[A-Za-z0-9+/]+=*$/.test(data.trim());
}
