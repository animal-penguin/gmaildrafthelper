import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { parseEmails } from './utils/emailParser';
import { createGmailDraft, wait } from './utils/gmail';
import { Button } from './components/Button';
import { ParsedEmailData, AppMode, ProgressState, MergeRow, MERGE_FIELD_NAMES } from './types';
import { Mail, Upload, FileSpreadsheet, Users, Play, LogOut, CheckCircle, AlertTriangle, Info, Lock } from 'lucide-react';

// Google OAuth Client ID from environment variable
// 本番環境では環境変数から読み込む（ハードコードしない）
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/gmail.compose';

const App: React.FC = () => {
  // --- State ---
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>('bulk');
  
  // Inputs
  const [rawInput, setRawInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedEmailData>({ uniqueEmails: [], totalFound: 0, duplicateCount: 0 });
  
  // Merge Mode State
  const [mergeRows, setMergeRows] = useState<MergeRow[]>([]);
  const [mergeHeaders, setMergeHeaders] = useState<string[]>([]);
  const [mergeFileName, setMergeFileName] = useState<string>('');
  // Excelから取得した列名（差込ボタン用）
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);
  
  // Additional Merge Fields (Excelに値がない場合の手動入力用)
  const [additionalFields, setAdditionalFields] = useState({
    email: '',
    companyName: '',
    contactName: '',
    projectName: '',
    url: '',
    date1: '',
    date2: '',
    reserve1: '',
    reserve2: '',
    reserve3: '',
    reserve4: ''
  });

  // 未定義タグの追跡
  const [undefinedTags, setUndefinedTags] = useState<Set<string>>(new Set());
  const [previewRow, setPreviewRow] = useState<number | null>(null);

  // 件名・本文のカーソル位置を追跡するためのref
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 最後にフォーカスした入力欄を追跡（ボタンクリック時にフォーカスが移るのを防ぐため）
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body' | null>(null);

  // Processing State
  const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 0, status: 'idle', logs: [] });
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Pending Action (for Resume after login)
  const [pendingAction, setPendingAction] = useState<'bulk' | 'merge' | null>(null);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // --- Effects ---

  useEffect(() => {
    if (mode === 'bulk') {
      const data = parseEmails(rawInput);
      setParsedData(data);
    }
  }, [rawInput, mode]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress.logs]);

  // Resume action after token is obtained
  useEffect(() => {
    if (token && pendingAction) {
      if (pendingAction === 'bulk') processBulk();
      if (pendingAction === 'merge') processMerge();
      setPendingAction(null);
    }
  }, [token, pendingAction]);

  // --- Handlers: Auth ---

  /**
   * Triggers the OAuth flow.
   * If successful, the 'token' state updates, triggering the useEffect above to resume action.
   */
  const requestAuth = (actionToResume: 'bulk' | 'merge') => {
    if (!window.google?.accounts?.oauth2) {
      alert('エラー: Google Identity Servicesが読み込まれていません。ページを再読み込みしてください。');
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: { access_token: string; error?: string }) => {
        if (response.error) {
          alert(`認証エラー: ${response.error}`);
          return;
        }
        if (response.access_token) {
          setToken(response.access_token);
          // Set pending action to trigger processing in useEffect
          setPendingAction(actionToResume);
        }
      },
    });
    client.requestAccessToken();
  };

  const handleLogout = () => {
    try {
      // 状態を先に初期化（revokeの成否に関わらず実行）
      const currentToken = token;
      setToken(null);
      setPendingAction(null);
      setProgress({ current: 0, total: 0, status: 'idle', logs: [] });

      // Google OAuthトークンのrevoke（可能なら実行）
      if (currentToken && window.google?.accounts?.oauth2) {
        try {
          window.google.accounts.oauth2.revoke(currentToken, () => {
            // revokeのコールバック（成功・失敗に関わらず何もしない、既に状態は初期化済み）
          });
        } catch (revokeError) {
          // revoke自体が失敗しても状態は既に初期化済みなので問題なし
          console.warn('トークンのrevokeに失敗しましたが、ログアウト処理は完了しました:', revokeError);
        }
      }
    } catch (error) {
      // 予期しないエラーが発生しても状態は初期化済み
      console.error('ログアウト処理中にエラーが発生しました:', error);
      // エラーが発生しても状態は既に初期化されているので、アラートを表示して継続
      alert('ログアウト処理中にエラーが発生しましたが、ログアウトは完了しました。');
    }
  };

  // --- Handlers: Action Trigger ---

  const handleStartProcess = () => {
    // 1. Validation
    if (mode === 'bulk' && parsedData.uniqueEmails.length === 0) {
      alert("宛先が入力されていません。");
      return;
    }
    if (mode === 'merge' && mergeRows.length === 0) {
      alert("Excelファイルがアップロードされていません。");
      return;
    }
    if (!subject) {
      alert("件名が入力されていません。");
      return;
    }

    // Validate CLIENT_ID is set
    if (!CLIENT_ID || !CLIENT_ID.includes('.apps.googleusercontent.com')) {
      alert("エラー: Google OAuth Client IDが正しく設定されていません。\n環境変数 VITE_GOOGLE_CLIENT_ID を設定してください。\n\nローカル環境: .env.localファイル\n本番環境: Renderの環境変数設定");
      return;
    }

    // 2. Auth Check
    if (!token) {
      // Not logged in: Trigger Auth flow, then auto-resume
      requestAuth(mode);
    } else {
      // Logged in: Start immediately
      if (mode === 'bulk') processBulk();
      if (mode === 'merge') processMerge();
    }
  };

  // --- Handlers: File Upload ---

  /**
   * Excelの日付セルをISO形式（YYYY-MM-DD）に変換
   * 【重要】空文字列やnull/undefinedの場合は空文字を返す（他行の値を参照しない）
   */
  const formatDateValue = (value: any, cellType?: string): string => {
    // null または undefined の場合は空文字を返す
    if (value === null || value === undefined) {
      return '';
    }
    
    // 既に文字列の場合はそのまま返す（空文字列も含む）
    if (typeof value === 'string') {
      return value; // 空文字列もそのまま返す
    }
    
    // Dateオブジェクトの場合はISO形式に変換
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Excelのシリアル値（数値）の場合は変換（XLSX.SSFを使用）
    if (typeof value === 'number' && cellType === 'd') {
      try {
        // @ts-ignore - XLSX.SSF.parse_date_codeの型定義が不完全な場合があるため
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          const year = date.y;
          const month = String(date.m).padStart(2, '0');
          const day = String(date.d).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        // パースに失敗した場合は空文字を返す（数値が不正な場合）
        console.warn('日付変換エラー:', e);
        return '';
      }
    }
    
    // その他は文字列化
    return String(value);
  };

  /**
   * メールアドレス列を柔軟に検出する関数
   * 列名のトリム、全角/半角の揺れ、大文字小文字の違いを吸収
   * 例: メールアドレス, Email, E-mail, email, mail などを許容
   */
  const findEmailColumn = (row: MergeRow, availableColumns: string[]): string | null => {
    // 正規化関数：トリム、小文字化、全角→半角変換、ハイフン/アンダースコアの統一
    const normalize = (str: string): string => {
      return str
        .trim()
        .toLowerCase()
        .replace(/[ー－−‐‑‒–—―─━]/g, '-') // 全角ハイフン類を半角ハイフンに統一
        .replace(/[＿_]/g, '_') // アンダースコアを統一
        .replace(/\s+/g, '') // 空白を除去
        .replace(/[ａ-ｚＡ-Ｚ０-９]/g, (s) => {
          // 全角英数字を半角に変換
          return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
    };

    // 許容されるメールアドレス列名のパターン（正規化後）
    const emailPatterns = [
      'メールアドレス',
      'email',
      'e-mail',
      'mail',
      'mailaddress',
      'mail_address',
      'emailaddress',
      'email_address',
      'to',
      '宛先',
      '送信先'
    ];

    // まず、利用可能な列名から検索
    for (const column of availableColumns) {
      const normalized = normalize(column);
      if (emailPatterns.some(pattern => normalized === normalize(pattern))) {
        return column; // 元の列名を返す（大文字小文字や全角半角を保持）
      }
    }

    // 利用可能な列名から見つからない場合、rowオブジェクトのキーから直接検索
    for (const key in row) {
      const normalized = normalize(key);
      if (emailPatterns.some(pattern => normalized === normalize(pattern))) {
        return key;
      }
    }

    return null;
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, cellNF: false, cellText: false });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // ヘッダー行を取得
      const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const headers: string[] = [];
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRange.s.r, c: C });
        const cell = ws[cellAddress];
        headers[C] = cell ? String(cell.v || '') : '';
      }
      
      // 列名を処理：重複列名をユニーク化（データ行でも使用するため、headers配列自体を更新）
      const headerCount: { [key: string]: number } = {};
      headers.forEach((header, index) => {
        const trimmedHeader = header.trim();
        // 空の列名はそのまま保持（データ行の処理で除外される）
        if (!trimmedHeader) {
          return;
        }
        
        // 重複チェック
        if (headerCount[trimmedHeader] !== undefined) {
          headerCount[trimmedHeader]++;
          const uniqueName = `${trimmedHeader}(${headerCount[trimmedHeader]})`;
          headers[index] = uniqueName; // データ行でも使用するため更新
        } else {
          headerCount[trimmedHeader] = 0;
        }
      });
      
      // 表示用の列名リスト（空の列名を除外、重複列名も含む）
      const uniqueColumns: string[] = headers.filter(h => h.trim() !== '');
      
      // データ行を取得（ヘッダー行以降）
      // 【重要】各行は独立したオブジェクトとして作成し、空欄も空文字として正しく保持
      const data: MergeRow[] = [];
      for (let R = headerRange.s.r + 1; R <= headerRange.e.r; ++R) {
        // 各行ごとに新しいオブジェクトを作成（前の行の値を参照しない）
        const row: MergeRow = {};
        headers.forEach((header, C) => {
          if (header) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];
            // 【修正】セルが存在しない、または値がnull/undefinedの場合は空文字を設定
            if (!cell || cell.v === undefined || cell.v === null) {
              row[header] = '';
            } else {
              // セルに値がある場合
              // 日付列（日付１、日付２、全角半角対応）の場合はISO形式に変換
              if (header === '日付１' || header === '日付1' || header === '日付２' || header === '日付2') {
                // formatDateValueは常に文字列を返す（空文字列も含む）
                row[header] = formatDateValue(cell.v, cell.t);
              } else {
                // その他の列は文字列化（空文字列も含む）
                // 【重要】空文字列もそのまま保持し、他行の値を参照しない
                row[header] = String(cell.v);
              }
            }
          }
        });
        // 少なくとも1つ以上の列があれば行として追加
        if (Object.keys(row).length > 0) {
          data.push(row);
        }
      }

      if (data.length > 0) {
        setMergeRows(data);
        setMergeHeaders(headers.filter(h => h));
        setUploadedColumns(uniqueColumns); // Excelから取得した列名を保存
        setMergeFileName(file.name);
        setPreviewRow(0); // 1行目をプレビューに設定
        setUndefinedTags(new Set()); // 未定義タグをリセット
        
        // Excelから読み込んだ値でadditionalFieldsを初期化（該当列があれば、ただし空でない場合のみ）
        // 注意: 全角・半角の違いに対応（日付１/日付1、予備１/予備1など）
        const firstRow = data[0];
        
        // メールアドレス列を柔軟に検出
        const emailColumnName = findEmailColumn(firstRow, uniqueColumns);
        const emailValue = emailColumnName && firstRow[emailColumnName] ? String(firstRow[emailColumnName]) : null;
        
        setAdditionalFields(prev => ({
          email: emailValue || prev.email,
          companyName: firstRow['会社名'] ? String(firstRow['会社名']) : prev.companyName,
          contactName: firstRow['担当者名'] ? String(firstRow['担当者名']) : prev.contactName,
          projectName: firstRow['案件名'] ? String(firstRow['案件名']) : prev.projectName,
          url: firstRow['URL'] ? String(firstRow['URL']) : prev.url,
          date1: (firstRow['日付１'] || firstRow['日付1']) ? String(firstRow['日付１'] || firstRow['日付1']) : prev.date1,
          date2: (firstRow['日付２'] || firstRow['日付2']) ? String(firstRow['日付２'] || firstRow['日付2']) : prev.date2,
          reserve1: (firstRow['予備１'] || firstRow['予備1']) ? String(firstRow['予備１'] || firstRow['予備1']) : prev.reserve1,
          reserve2: (firstRow['予備２'] || firstRow['予備2']) ? String(firstRow['予備２'] || firstRow['予備2']) : prev.reserve2,
          reserve3: (firstRow['予備３'] || firstRow['予備3']) ? String(firstRow['予備３'] || firstRow['予備3']) : prev.reserve3,
          reserve4: (firstRow['予備４'] || firstRow['予備4']) ? String(firstRow['予備４'] || firstRow['予備4']) : prev.reserve4
        }));
      }
    };
    reader.readAsBinaryString(file);
  };

  /**
   * カーソル位置にプレースホルダーを挿入する関数
   * フォーカスされている入力欄（件名 or 本文）に自動で挿入する
   */
  const insertAtCursor = (placeholder: string, target?: 'subject' | 'body') => {
    const textToInsert = `{${placeholder}}`;
    
    // targetが指定されていない場合は、最後にフォーカスした入力欄を優先して使用
    let actualTarget: 'subject' | 'body' = target || 'body';
    if (!target) {
      // まず最後にフォーカスした入力欄をチェック
      if (lastFocusedField === 'subject' || lastFocusedField === 'body') {
        actualTarget = lastFocusedField;
      } else {
        // 最後にフォーカスした情報がない場合は、現在のactiveElementをチェック
        if (document.activeElement === subjectInputRef.current) {
          actualTarget = 'subject';
        } else if (document.activeElement === bodyTextareaRef.current) {
          actualTarget = 'body';
        } else {
          // どちらもフォーカスされていない場合は本文をデフォルトとする
          actualTarget = 'body';
        }
      }
    }
    
    if (actualTarget === 'subject' && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = subject.slice(0, start) + textToInsert + subject.slice(end);
      setSubject(newValue);
      
      // カーソル位置を挿入したテキストの後に移動
      setTimeout(() => {
        input.focus();
        const newCursorPos = start + textToInsert.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (actualTarget === 'body' && bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newValue = body.slice(0, start) + textToInsert + body.slice(end);
      setBody(newValue);
      
      // カーソル位置を挿入したテキストの後に移動
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // フォーカスがない場合は末尾に追加（フォールバック）
      if (actualTarget === 'subject') {
        setSubject(prev => prev + textToInsert);
      } else {
        setBody(prev => prev + textToInsert);
      }
    }
  };

  // 後方互換性のため残す
  const insertPlaceholder = insertAtCursor;

  // --- Handlers: Processing ---

  const log = (msg: string) => {
    setProgress(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  const processBulk = async () => {
    // Use a local reference to token to satisfy TS, though logic ensures it exists
    const currentToken = token; 
    if (!currentToken) return; // Should not happen due to handleStartProcess logic

    setProgress({ current: 0, total: 1, status: 'processing', logs: ['処理を開始します...'] });

    try {
      log(`一括ドラフト作成中 (BCC宛先: ${parsedData.uniqueEmails.length}件)...`); // CC → BCC 変更
      
      await createGmailDraft(currentToken, {
        bcc: parsedData.uniqueEmails, // CC → BCC 変更
        subject: subject,
        body: body
      });

      log('成功: 下書きを作成しました。Gmailを確認してください。');
      setProgress(prev => ({ ...prev, current: 1, status: 'completed' }));
    } catch (error: any) {
      log(`エラー: ${error.message}`);
      setProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  /**
   * テンプレート文字列内の全タグを動的に探索して置換
   * 未定義タグは警告を出して残す
   * 
   * 【重要】各行は完全に独立して処理する
   * - Excelのセルが空欄（空文字/null/undefined）の場合 → 空文字を返す
   * - 他行の値を参照・補完・再利用してはならない
   */
  const replaceMergeTags = (template: string, row: MergeRow, rowIndex: number): { result: string; undefinedTags: Set<string> } => {
    const undefinedTagsSet = new Set<string>();
    
    // 正規表現で全タグを探索 {タグ名}
    const tagPattern = /\{([^}]+)\}/g;
    let result = template;
    let match;
    const replacedTags = new Set<string>();
    
    while ((match = tagPattern.exec(template)) !== null) {
      const tagName = match[1];
      
      // 既に置換済みのタグはスキップ
      if (replacedTags.has(tagName)) continue;
      replacedTags.add(tagName);
      
      let replacement = '';
      
      // 【修正】その行のrowオブジェクトのみを参照（他行の値を参照しない）
      // 該当列がrowに存在するかチェック
      if (row.hasOwnProperty(tagName)) {
        // 列が存在する場合、その行の値を取得（null/undefined/空文字列も含む）
        // 【重要】この行の値のみを使用し、他行の値は参照しない
        const cellValue = row[tagName];
        
        // null または undefined の場合は空文字
        if (cellValue == null) {
          replacement = '';
        } else {
          // 値がある場合は文字列化
          // 注意: 空文字列 '' も数値 0 も正しく文字列化される
          replacement = String(cellValue);
        }
        // cellValue が空文字列 '' の場合、String('') は '' を返す（正しい動作）
        // cellValue が null/undefined の場合は既に上で '' が設定されている
      } else {
        // 列が存在しない場合のみ、共通値（additionalFields）を使用
        // メールアドレス、会社名、担当者名、案件名、URL、日付１、日付２、予備１〜４に対応
        if (tagName === 'メールアドレス') {
          replacement = additionalFields.email || '';
        } else if (tagName === '会社名') {
          replacement = additionalFields.companyName || '';
        } else if (tagName === '担当者名') {
          replacement = additionalFields.contactName || '';
        } else if (tagName === '案件名') {
          replacement = additionalFields.projectName || '';
        } else if (tagName === 'URL') {
          replacement = additionalFields.url || '';
        } else if (tagName === '日付１' || tagName === '日付1') {
          replacement = additionalFields.date1 || '';
        } else if (tagName === '日付２' || tagName === '日付2') {
          replacement = additionalFields.date2 || '';
        } else if (tagName === '予備１' || tagName === '予備1') {
          replacement = additionalFields.reserve1 || '';
        } else if (tagName === '予備２' || tagName === '予備2') {
          replacement = additionalFields.reserve2 || '';
        } else if (tagName === '予備３' || tagName === '予備3') {
          replacement = additionalFields.reserve3 || '';
        } else if (tagName === '予備４' || tagName === '予備4') {
          replacement = additionalFields.reserve4 || '';
        } else {
          // その他の列で、Excelに存在しない場合は空文字（未定義タグとして記録）
          replacement = '';
          if (rowIndex === 0) {
            undefinedTagsSet.add(tagName);
          }
        }
      }
      
      // 置換実行（エスケープされた波括弧に対応）
      const regex = new RegExp(`\\{${tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
      result = result.replace(regex, replacement);
    }
    
    return { result, undefinedTags: undefinedTagsSet };
  };

  const processMerge = async () => {
    const currentToken = token;
    if (!currentToken) return;

    setProgress({ current: 0, total: mergeRows.length, status: 'processing', logs: ['差込処理を開始します...'] });

    let successCount = 0;
    let failCount = 0;
    const allUndefinedTags = new Set<string>();

    // メールアドレス列を検出（最初の行から判定、全行で同じ列名を使用）
    const emailColumnName = mergeRows.length > 0 ? findEmailColumn(mergeRows[0], uploadedColumns) : null;
    
    if (!emailColumnName && mergeRows.length > 0) {
      log(`エラー: メールアドレス列が見つかりません。Email, E-mail, email, mail, メールアドレス などの列名を使用してください。`);
      setProgress(prev => ({ ...prev, status: 'error' }));
      return;
    }

    if (emailColumnName) {
      log(`メールアドレス列を検出: 「${emailColumnName}」`);
    }

    for (let i = 0; i < mergeRows.length; i++) {
      // 【重要】各行を独立して取得（前の行の値を参照しない）
      const row = mergeRows[i];
      
      // 検出したメールアドレス列から値を取得
      // その行の値のみを使用し、空文字列の場合はnullとして扱う
      const emailValue = emailColumnName && row.hasOwnProperty(emailColumnName) ? row[emailColumnName] : null;
      const email = emailValue != null && String(emailValue).trim() !== '' ? String(emailValue) : null;

      if (!email) {
        log(`[行 ${i + 1}] スキップ: メールアドレスが空です。`);
        failCount++;
        continue;
      }

      // 動的タグ探索と置換
      const subjectResult = replaceMergeTags(subject, row, i);
      const bodyResult = replaceMergeTags(body, row, i);
      
      // 未定義タグを記録（最初の行のみ）
      if (i === 0) {
        subjectResult.undefinedTags.forEach(tag => allUndefinedTags.add(tag));
        bodyResult.undefinedTags.forEach(tag => allUndefinedTags.add(tag));
      }

      try {
        await createGmailDraft(currentToken, {
          to: email, 
          subject: subjectResult.result,
          body: bodyResult.result
        });
        log(`[${i + 1}/${mergeRows.length}] 作成完了: ${email}`);
        successCount++;
      } catch (error: any) {
        log(`[${i + 1}/${mergeRows.length}] エラー (${email}): ${error.message}`);
        failCount++;
      }

      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      if (i < mergeRows.length - 1) {
        await wait(1000); 
      }
    }

    // 未定義タグの警告
    if (allUndefinedTags.size > 0) {
      const tagsList = Array.from(allUndefinedTags).join(', ');
      log(`警告: 以下のタグが定義されていません: {${tagsList}}`);
    }

    log(`完了: 成功 ${successCount}件 / 失敗 ${failCount}件`);
    setProgress(prev => ({ ...prev, status: 'completed' }));
    setUndefinedTags(allUndefinedTags);
  };

  // --- UI Components ---

  const renderProgress = () => {
    if (progress.status === 'idle') return null;
    const percent = Math.round((progress.current / progress.total) * 100) || 0;
    
    return (
      <div className="mt-6 bg-gray-900 text-gray-100 rounded-lg p-4 shadow-lg animate-fade-in">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold flex items-center">
            {progress.status === 'processing' && <span className="animate-spin mr-2">⏳</span>}
            {progress.status === 'completed' && <span className="mr-2">✅</span>}
            処理ステータス
          </span>
          <span className="text-sm">{percent}% ({progress.current}/{progress.total})</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
        </div>
        <div className="h-32 overflow-y-auto custom-scrollbar text-xs font-mono space-y-1 bg-gray-800 p-2 rounded">
          {progress.logs.map((l, i) => (
            <div key={i} className="border-b border-gray-700 last:border-0 pb-1">{l}</div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-lg shadow-lg mr-3">
              <Mail size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">メール一括作成</h1>
            </div>
          </div>
          <div className="flex space-x-2 items-center">
            {token ? (
              <span className="text-xs text-green-600 font-medium mr-2 flex items-center bg-green-50 px-2 py-1 rounded">
                <CheckCircle size={12} className="mr-1" />
                認証済み
              </span>
            ) : null}
            
            {token && (
              <Button onClick={handleLogout} variant="secondary" className="px-2 py-1 h-8 text-xs">
                <LogOut size={14} className="mr-1" /> ログアウト
              </Button>
            )}
          </div>
        </div>

        {/* Service Description */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700 leading-relaxed">
            ・このサイトではメールを一括作成できます<br />
            ・作成されたメールはGmailの下書きとして保存されます<br />
            ・メール内容やアドレスを含むすべての情報は本サービスに保存されません<br />
            ・Gmailだけでなく、会社のメールアドレスをGmailに接続して送信することも可能です<br />
            ※会社メールを利用する場合は、GmailアカウントにSMTP設定が必要です
          </p>
        </div>

        {/* Main Workspace (Always Visible) */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${mode === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setMode('bulk')}
            >
              <Users size={18} className="inline mr-2 mb-1" />
              一括同一文面 (BCC送信)
            </button>
            <button
              className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${mode === 'merge' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setMode('merge')}
            >
              <FileSpreadsheet size={18} className="inline mr-2 mb-1" />
              Excel差込作成 (個別送信)
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* --- BULK MODE UI --- */}
            {mode === 'bulk' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    送信先リスト (BCCに入ります)
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full shadow-sm border-gray-300 rounded-md p-3 border focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="メールアドレスを貼り付け..."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                  />
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-1 text-green-500" />
                    有効なアドレス: <strong>{parsedData.uniqueEmails.length}</strong> 件
                    {parsedData.duplicateCount > 0 && (
                      <span className="ml-3 text-amber-600 flex items-center">
                         <AlertTriangle size={14} className="mr-1" /> 重複除去: {parsedData.duplicateCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- MERGE MODE UI --- */}
            {mode === 'merge' && (
              <div className="space-y-4 animate-fade-in">
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-100' 
                      : 'border-gray-300 hover:bg-gray-50 bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      // ファイル形式のチェック
                      const validExtensions = ['.xlsx', '.xls', '.csv'];
                      const fileName = file.name.toLowerCase();
                      const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
                      
                      if (isValidFile) {
                        handleFileUpload(file);
                      } else {
                        alert('Excelファイル (.xlsx, .xls, .csv) をアップロードしてください。');
                      }
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer w-full block">
                    <Upload size={32} className={`mx-auto mb-2 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} />
                    <span className="block text-sm font-medium text-gray-900">
                      {mergeFileName || "Excelファイルをアップロード"}
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      1行目をヘッダーとして読み込みます (.xlsx)
                    </span>
                  </label>
                </div>

                {mergeRows.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium mb-2 flex items-center">
                      <FileSpreadsheet size={16} className="mr-2" />
                      {mergeRows.length}行のデータを読み込みました
                    </p>
                  </div>
                )}

                {/* Excelから取得した列名の差込ボタン */}
                {uploadedColumns.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <p className="text-sm text-green-800 font-medium mb-3 flex items-center">
                      <FileSpreadsheet size={16} className="mr-2" />
                      Excelから取得した項目（フォーカス中の入力欄に挿入）
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {uploadedColumns.map(columnName => (
                        <button
                          key={columnName}
                          type="button"
                          onClick={() => insertAtCursor(columnName)}
                          className="px-3 py-1.5 bg-white border border-green-300 rounded text-xs text-green-700 hover:bg-green-100 transition-colors shadow-sm font-medium"
                          title={`フォーカスされている入力欄（件名 or 本文）に「{${columnName}}」を挿入`}
                        >
                          {`{${columnName}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}


            {/* --- COMMON INPUTS --- */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  className="block w-full shadow-sm border-gray-300 rounded-md p-2 border focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setLastFocusedField('subject')}
                  placeholder={mode === 'merge' ? "{会社名}様 お見積りの件" : "件名を入力"}
                />
                {/* プレビュー表示（差込モード、データ読み込み済みの場合） */}
                {mode === 'merge' && mergeRows.length > 0 && previewRow !== null && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs font-medium text-green-800 mb-2">差込プレビュー（1行目データ）:</p>
                    <div className="space-y-1 text-xs">
                      <div className="font-medium text-gray-700">件名プレビュー:</div>
                      <div className="bg-white p-2 rounded border border-green-300 font-mono text-sm">
                        {(() => {
                          const previewRowData = mergeRows[previewRow || 0];
                          const result = replaceMergeTags(subject, previewRowData, 0);
                          return result.result || '(プレビューなし)';
                        })()}
                      </div>
                      <div className="font-medium text-gray-700 mt-2">本文プレビュー:</div>
                      <div className="bg-white p-2 rounded border border-green-300 font-mono text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {(() => {
                          const previewRowData = mergeRows[previewRow || 0];
                          const result = replaceMergeTags(body, previewRowData, 0);
                          return result.result || '(プレビューなし)';
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 未定義タグ警告 */}
                {mode === 'merge' && undefinedTags.size > 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                    <p className="text-xs font-medium text-yellow-800 mb-1 flex items-center">
                      <AlertTriangle size={14} className="mr-1" />
                      未定義タグの警告:
                    </p>
                    <p className="text-xs text-yellow-700">
                      以下のタグがExcelに存在せず、置換されません: {Array.from(undefinedTags).map(t => `{${t}}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                <textarea
                  ref={bodyTextareaRef}
                  rows={8}
                  className="block w-full shadow-sm border-gray-300 rounded-md p-3 border focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => setLastFocusedField('body')}
                  placeholder={mode === 'merge' ? "{担当者名} 様\n\nお世話になっております。\n案件名: {案件名}\nURL: {URL}" : "本文を入力"}
                />
              </div>
            </div>

            {/* --- ACTION AREA --- */}
            <div className="pt-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {!token && (
                  <div className="mb-3 flex items-start text-sm text-gray-600">
                    <Info size={16} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                    <p>
                      「下書きを作成」ボタンを押すとGoogle認証画面が開きます。<br/>
                      入力データはブラウザ内でのみ処理され、外部には送信されません。
                    </p>
                  </div>
                )}
                
                <Button 
                  fullWidth 
                  onClick={handleStartProcess}
                  disabled={
                    progress.status === 'processing' || 
                    !subject || 
                    (mode === 'bulk' && parsedData.uniqueEmails.length === 0) ||
                    (mode === 'merge' && mergeRows.length === 0)
                  }
                  className={`h-14 text-lg font-bold shadow-md ${!token ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                >
                  {progress.status === 'processing' ? '処理中...' : (
                    <>
                      {!token ? <Lock size={20} className="mr-2" /> : <Play size={20} className="mr-2" />}
                      {/* CC → BCC 変更 */}
                      {!token ? 'Google認証して下書き作成' : (mode === 'bulk' ? '一括下書きを作成 (BCC)' : '差込下書きを作成')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* --- PROGRESS DISPLAY --- */}
            {renderProgress()}

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;