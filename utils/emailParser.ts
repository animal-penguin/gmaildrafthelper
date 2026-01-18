import { ParsedEmailData } from '../types';

/**
 * Parses a raw string to extract email addresses.
 * Handles commas, semicolons, newlines, tabs, and mixed text.
 * Returns unique emails and stats.
 */
export const parseEmails = (text: string): ParsedEmailData => {
  if (!text) {
    return { uniqueEmails: [], totalFound: 0, duplicateCount: 0 };
  }

  // Regex to match email patterns.
  // This captures standard email formats.
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  const matches = text.match(emailRegex) || [];
  
  // Normalize to lowercase to detect duplicates accurately
  const normalizedEmails = matches.map(email => email.toLowerCase());
  
  const uniqueSet = new Set(normalizedEmails);
  const uniqueEmails = Array.from(uniqueSet);

  return {
    uniqueEmails,
    totalFound: matches.length,
    duplicateCount: matches.length - uniqueEmails.length,
  };
};

/**
 * Generates the Gmail Compose URL.
 */
export const generateGmailUrl = (bcc: string[], subject: string, body: string): string => {
  const baseUrl = "https://mail.google.com/mail/?view=cm&fs=1&tf=1";
  
  // Join emails with commas for the BCC field
  const bccStr = bcc.join(',');
  
  const params = new URLSearchParams();
  // We don't use the URLSearchParams for the base parameters that are hardcoded above to ensure order/compatibility,
  // but strictly for the user content.
  // Actually, standard URL params are safer.
  
  // Gmail expects:
  // bcc: comma separated list
  // su: subject
  // body: body text
  
  return `${baseUrl}&bcc=${encodeURIComponent(bccStr)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};