import { DraftConfig } from '../types';

/**
 * Encodes a string to Base64 format (RFC 2045 compliant for Gmail API).
 * Handles UTF-8 characters correctly.
 */
const base64Encode = (str: string): string => {
  // Convert string to UTF-8 bytes
  const utf8Bytes = new TextEncoder().encode(str);
  // Convert bytes to binary string
  const binaryString = Array.from(utf8Bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  // Encode to base64
  return btoa(binaryString);
};

/**
 * Encodes a header value using RFC 2047 for non-ASCII characters.
 */
const encodeHeader = (value: string): string => {
  // Check if value contains non-ASCII characters
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }
  // Encode non-ASCII characters using RFC 2047
  return `=?UTF-8?B?${base64Encode(value)}?=`;
};

/**
 * Constructs a raw MIME email message as a plain text string.
 * The entire message will be base64url-encoded for the Gmail API raw field.
 */
const createMimeMessage = (config: DraftConfig): string => {
  const lines: string[] = [];
  
  // MIME headers
  if (config.to) lines.push(`To: ${config.to}`);
  if (config.bcc && config.bcc.length > 0) {
    lines.push(`Bcc: ${config.bcc.join(', ')}`); // CC → BCC 変更
  }
  lines.push(`Subject: ${encodeHeader(config.subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push(''); // Empty line separating headers and body
  
  // Body (plain text - the entire MIME message will be base64url-encoded)
  lines.push(config.body);

  return lines.join('\r\n');
};

/**
 * Converts a string to base64url format (RFC 4648) as required by Gmail API.
 */
const toBase64Url = (str: string): string => {
  // Convert string to UTF-8 bytes
  const utf8Bytes = new TextEncoder().encode(str);
  // Convert bytes to binary string
  const binaryString = Array.from(utf8Bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  // Encode to base64
  const base64 = btoa(binaryString);
  // Convert to base64url format (RFC 4648)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Creates a draft in Gmail via API.
 * The raw field must be a base64url-encoded string of the MIME message.
 */
export const createGmailDraft = async (accessToken: string, config: DraftConfig): Promise<any> => {
  const mimeMessage = createMimeMessage(config);
  
  // Gmail API requires the raw field to be base64url-encoded (RFC 4648)
  const base64UrlEncoded = toBase64Url(mimeMessage);
  
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: base64UrlEncoded
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Wait function for rate limiting
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));