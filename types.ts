export interface ParsedEmailData {
  uniqueEmails: string[];
  totalFound: number;
  duplicateCount: number;
}

export interface MergeRow {
  [key: string]: string | number | Date | undefined;
}

// 指定された差込列の定義（日本語ヘッダー名で完全一致、全角数字を使用）
export const MERGE_FIELD_NAMES = [
  'メールアドレス',
  '会社名',
  '担当者名',
  '案件名',
  'URL',
  '日付１',  // 全角数字
  '日付２',  // 全角数字
  '予備１',  // 全角数字
  '予備２',  // 全角数字
  '予備３',  // 全角数字
  '予備４'   // 全角数字
] as const;

export type MergeFieldName = typeof MERGE_FIELD_NAMES[number];

export type AppMode = 'bulk' | 'merge';

export interface ProgressState {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  logs: string[];
}

export interface DraftConfig {
  to?: string;
  bcc?: string[]; // CC → BCC 変更
  subject: string;
  body: string;
}