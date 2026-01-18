# Render デプロイガイド

このドキュメントでは、Gmail Draft Helper を Render にデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Renderアカウント（https://render.com で無料アカウント作成可能）
- Google Cloud Console アカウント（OAuth Client ID取得用）

## デプロイ手順

### 1. GitHub リポジトリの作成

1. GitHubで新しいリポジトリを作成
   - リポジトリ名: `gmail-draft-helper` (推奨)
   - 公開/非公開: 任意
   - README、.gitignore、ライセンスは既にあるため追加不要

2. ローカルから GitHub にプッシュ:

```bash
cd d:\gmail-draft-helper
git init
git add .
git commit -m "Initial commit: Gmail Draft Helper"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git
git push -u origin main
```

### 2. Google Cloud Console での設定（事前準備）

**重要**: Render デプロイ前に、本番URLを OAuth 設定に追加できるよう準備しておきます。

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「認証情報」に移動
4. 既存の OAuth 2.0 クライアント ID を編集（または新規作成）
5. 「承認済みの JavaScript 生成元」に以下を追加（後で本番URLに更新）：
   - `http://localhost:3000` (ローカル開発用)
   - `https://gmail-draft-helper.onrender.com` (仮のURL、実際のURLはデプロイ後に確認)

### 3. Render でのデプロイ設定

#### 3.1 新しい Web Service を作成

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. 「New +」ボタンをクリック
3. 「Web Service」を選択

#### 3.2 リポジトリを接続

1. 「Connect account」で GitHub を選択
2. GitHub アカウントを認証
3. リポジトリ `gmail-draft-helper` を選択

#### 3.3 ビルド設定

以下の設定を入力：

| 項目 | 値 |
|------|-----|
| **Name** | `gmail-draft-helper` (任意、URLに使用されます) |
| **Environment** | `Node` |
| **Branch** | `main` |
| **Root Directory** | (空白のまま) |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` (自動検出される場合もあります) |
| **Node Version** | `20.18.0` (または `.nvmrc` で自動検出) |

#### 3.4 環境変数の設定

「Environment」セクションで以下の環境変数を追加：

| Key | Value |
|-----|-------|
| `VITE_GOOGLE_CLIENT_ID` | あなたのGoogle OAuth Client ID |

**注意**: 
- 環境変数名は `VITE_` で始まる必要があります（Viteの仕様）
- 値は `your-client-id.apps.googleusercontent.com` 形式

#### 3.5 デプロイの実行

1. 「Create Web Service」をクリック
2. ビルドが開始されます（初回は3-5分程度かかります）
3. デプロイが完了すると、以下のようなURLが生成されます：
   - `https://gmail-draft-helper.onrender.com`
   - または `https://gmail-draft-helper-XXXX.onrender.com` (XXXXはランダム)

**注意**: Web Service としてデプロイする場合、`npm start` スクリプトが実行されます。`package.json` に `start` スクリプトが定義されていることを確認してください。

### 4. Google Cloud Console での本番URL登録

デプロイ完了後、生成された本番URLを Google OAuth 設定に追加：

1. [Google Cloud Console](https://console.cloud.google.com/) に戻る
2. 「APIとサービス」→「認証情報」に移動
3. OAuth 2.0 クライアント ID を編集
4. 「承認済みの JavaScript 生成元」に Render で生成されたURLを追加：
   - 例: `https://gmail-draft-helper.onrender.com`
   - **重要**: `https://` で始まり、末尾にスラッシュは不要
5. 「保存」をクリック

### 5. 動作確認

#### 5.1 基本動作確認

1. ブラウザで本番URLにアクセス
2. アプリが正常に表示されることを確認
3. 「Excel差込作成」タブを選択
4. ツールバーが表示されることを確認

#### 5.2 OAuth認証の確認

1. Excelファイルをアップロード（テスト用）
2. 件名・本文を入力
3. 「下書きを作成」ボタンをクリック
4. Google認証画面が表示されることを確認
5. 認証を完了
6. 下書きが正常に作成されることを確認

#### 5.3 差込機能の確認

1. テスト用Excelファイルを用意：
   ```
   メールアドレス | 会社名 | 担当者名
   test@example.com | テスト会社 | 山田太郎
   test2@example.com | 会社B | 佐藤花子
   ```

2. Excelファイルをアップロード
3. 件名: `{会社名}様 お見積りの件`
4. 本文: `{担当者名}様\n\nお世話になっております。`
5. 「下書きを作成」をクリック
6. 各行に対して個別に下書きが作成されることを確認

## トラブルシューティング

### OAuth エラーが発生する場合

#### エラー: `redirect_uri_mismatch` または `origin_mismatch`

**原因**: Google Cloud Console の「承認済みの JavaScript 生成元」に本番URLが登録されていない

**対処法**:
1. Render で生成されたURLを確認（Settings → URL）
2. Google Cloud Console の「承認済みの JavaScript 生成元」に正確なURLを追加
3. URLは `https://` で始まり、末尾にスラッシュがないことを確認
4. 変更後、数分待ってから再試行（反映に時間がかかる場合があります）

#### エラー: `Invalid client ID`

**原因**: 環境変数 `VITE_GOOGLE_CLIENT_ID` が正しく設定されていない、またはビルド時に埋め込まれていない

**対処法**:
1. Render ダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数名は `VITE_GOOGLE_CLIENT_ID`（`VITE_` プレフィックス必須）
3. 環境変数を変更した場合は、手動で再ビルドが必要：
   - Render ダッシュボード → 「Manual Deploy」→ 「Clear build cache & deploy」
4. ビルドログで環境変数が読み込まれているか確認

### ビルドエラーが発生する場合

#### エラー: `Cannot find module` または依存関係エラー

**対処法**:
1. `package.json` の依存関係が正しく定義されているか確認
2. Build Command を `npm ci && npm run build` に変更（`package-lock.json` を使用）
3. Nodeバージョンを `.nvmrc` で指定（20.18.0）

#### エラー: `Module not found: Can't resolve`

**対処法**:
1. `vite.config.ts` の設定を確認
2. すべての依存関係が `package.json` に含まれているか確認
3. 開発依存関係と本番依存関係を区別する

### 環境変数が読み込まれない場合

**原因**: Vite はビルド時に環境変数を埋め込むため、実行時には変更できない

**対処法**:
1. 環境変数名は `VITE_` で始まる必要がある
2. 環境変数を変更したら必ず再ビルド・再デプロイする
3. ビルドログで `import.meta.env.VITE_GOOGLE_CLIENT_ID` が正しく置換されているか確認

### アプリが表示されない場合

**対処法**:
1. 「Publish Directory」が `dist` に設定されているか確認
2. ビルドが正常に完了しているか確認（ビルドログを確認）
3. `dist/index.html` が存在するか確認
4. ブラウザの開発者ツールでコンソールエラーを確認

### CORS エラーが発生する場合

**注意**: このアプリは Gmail API を直接ブラウザから呼び出すため、CORS エラーは発生しません（Google Identity Services と Gmail API が CORS に対応しているため）

## Render 設定の確認項目

デプロイ後、以下の設定を確認してください：

- ✅ Build Command: `npm install && npm run build`
- ✅ Publish Directory: `dist`
- ✅ 環境変数 `VITE_GOOGLE_CLIENT_ID` が設定されている
- ✅ Node Version: `20.18.0` (または自動検出)
- ✅ Branch: `main`
- ✅ Auto-Deploy: `Yes` (推奨、GitHub push時に自動デプロイ)

## カスタムドメインの設定（オプション）

Render ではカスタムドメインを設定できます：

1. Render ダッシュボード → Settings → Custom Domains
2. カスタムドメインを追加
3. DNS設定を Render の指示に従って設定
4. Google Cloud Console の「承認済みの JavaScript 生成元」にカスタムドメインも追加

## セキュリティに関する注意事項

- ✅ 環境変数は Render の環境変数設定で管理（GitHub にコミットしない）
- ✅ `.env.local` は `.gitignore` に含まれていることを確認
- ✅ Client ID は公開されても問題ないが、Client Secret は使用していない（SPA構成のため）
- ✅ HTTPS で提供されるため、通信は暗号化される

## その他のデプロイプラットフォーム

Render 以外にも以下のプラットフォームでデプロイ可能です：

- **Vercel**: Static Site としてデプロイ可能
- **Netlify**: Static Site としてデプロイ可能
- **GitHub Pages**: 静的サイトとしてデプロイ可能（ただし、環境変数の設定方法が異なる）

各プラットフォームで環境変数の設定方法が異なるため、該当プラットフォームのドキュメントを参照してください。
