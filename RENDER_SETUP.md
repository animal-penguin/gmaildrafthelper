# Render デプロイ設定まとめ

このファイルには、Render にデプロイする際の設定内容をまとめています。

## Render Web Service (Node) 設定

### 基本設定

| 項目 | 設定値 | 説明 |
|------|--------|------|
| **Name** | `gmail-draft-helper` | 任意の名前（URLに使用されます） |
| **Environment** | `Node` | Node.js 環境を選択 |
| **Branch** | `main` | デプロイするブランチ |
| **Root Directory** | (空白) | プロジェクトルートから開始 |
| **Build Command** | `npm install && npm run build` | ビルドコマンド |
| **Start Command** | `npm start` | 起動コマンド（自動検出される場合もあります） |
| **Node Version** | `20.18.0` | `.nvmrc` で指定（自動検出可能） |

**注意**: Render Web Service としてデプロイする場合、`npm start` スクリプトが必要です。`package.json` に `start` スクリプトが定義されていることを確認してください。

## Render Static Site 設定（代替案）

静的サイトとしてデプロイする場合の設定：

| 項目 | 設定値 | 説明 |
|------|--------|------|
| **Name** | `gmail-draft-helper` | 任意の名前（URLに使用されます） |
| **Branch** | `main` | デプロイするブランチ |
| **Root Directory** | (空白) | プロジェクトルートから開始 |
| **Build Command** | `npm install && npm run build` | ビルドコマンド |
| **Publish Directory** | `dist` | ビルド後の出力ディレクトリ |
| **Node Version** | `20.18.0` | `.nvmrc` で指定（自動検出可能） |

### 環境変数設定

| Key | Value | 説明 |
|-----|-------|------|
| `VITE_GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Google OAuth Client ID |

**重要**: 
- 環境変数名は `VITE_` で始まる必要があります
- 値は Google Cloud Console で取得した Client ID です
- 環境変数を変更したら、必ず再ビルドが必要です

### 自動デプロイ設定

- **Auto-Deploy**: `Yes` を推奨
- GitHub に push すると自動的にデプロイされます

## Google Cloud Console 設定

### OAuth 2.0 クライアント ID の設定

1. **承認済みの JavaScript 生成元** に以下を追加:
   ```
   http://localhost:3000
   https://gmail-draft-helper.onrender.com
   ```
   （実際のURLは Render デプロイ後に確認して追加）

2. **承認済みのリダイレクト URI** は不要（SPA構成のため）

### Gmail API の有効化

1. 「APIとサービス」→「ライブラリ」に移動
2. 「Gmail API」を検索して有効化

## ビルドログの確認ポイント

ビルドが正常に完了しているか確認する項目：

- ✅ `npm install` が正常に完了
- ✅ `npm run build` が正常に完了
- ✅ `dist` ディレクトリに `index.html` が生成されている
- ✅ エラーメッセージがない

## デプロイ後の確認

1. **本番URLにアクセス**
   - Render ダッシュボードで生成されたURLを確認
   - 例: `https://gmail-draft-helper.onrender.com`

2. **アプリが表示されるか確認**
   - ブラウザで本番URLにアクセス
   - エラーが表示されないか確認

3. **Google認証が動作するか確認**
   - 「下書きを作成」ボタンをクリック
   - Google認証画面が表示されることを確認
   - 認証後に下書きが作成されることを確認

## トラブルシューティング

### 環境変数が読み込まれない

**症状**: アプリは表示されるが、Google認証が失敗する

**確認項目**:
1. Render ダッシュボードで環境変数が正しく設定されているか
2. 環境変数名が `VITE_GOOGLE_CLIENT_ID` であるか（`VITE_` プレフィックス必須）
3. ビルドログにエラーがないか
4. 環境変数を変更した場合は再デプロイが必要

### OAuth エラー: origin_mismatch

**症状**: Google認証時に `origin_mismatch` エラーが表示される

**対処法**:
1. Render で生成されたURLを確認（Settings → URL）
2. Google Cloud Console の「承認済みの JavaScript 生成元」に正確なURLを追加
3. URLは `https://` で始まり、末尾にスラッシュは不要
4. 例: `https://gmail-draft-helper.onrender.com` （正しい）
5. 例: `https://gmail-draft-helper.onrender.com/` （誤り - 末尾スラッシュなし）

### ビルドが失敗する

**症状**: デプロイ時にビルドエラーが発生する

**確認項目**:
1. Node バージョンが `.nvmrc` で指定されたバージョンと一致しているか
2. `package.json` の依存関係が正しいか
3. ビルドログを確認してエラー内容を特定

**対処法**:
- Node バージョンを明示的に指定: Render ダッシュボード → Settings → Node Version
- Build Command を `npm ci && npm run build` に変更（依存関係を再インストール）
