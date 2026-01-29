import crypto from 'crypto';

/**
 * Decrypt OwnTracks encrypted payload
 * OwnTracks uses AES-256-CBC encryption
 */
export function decryptPayload(encryptedData: string, key: string): any {
  try {
    // OwnTracks sends base64 encoded encrypted data
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract IV (first 16 bytes) and encrypted data
    const iv = buffer.slice(0, 16);
    const encrypted = buffer.slice(16);
    
    // Create decipher
    const keyBuffer = Buffer.from(key, 'utf8');
    const keyHash = crypto.createHash('sha256').update(keyBuffer).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
    
    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Parse JSON
    return JSON.parse(decrypted.toString('utf8'));
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
