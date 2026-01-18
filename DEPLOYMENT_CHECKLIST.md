# Render デプロイ チェックリスト

このチェックリストに従って、Render へのデプロイを完了してください。

## デプロイ前の準備

### ✅ 1. 環境変数の設定確認

- [ ] `.env.local` ファイルが存在する（ローカル開発用）
- [ ] `.env.example` ファイルが存在する
- [ ] `App.tsx` の `CLIENT_ID` がハードコードされていない
- [ ] `import.meta.env.VITE_GOOGLE_CLIENT_ID` を使用している
- [ ] `.gitignore` に `.env.local` が含まれている

### ✅ 2. OAuth 設定の確認

- [ ] Google Identity Services (GSI) を使用していることを確認
  - `index.html` に `<script src="https://accounts.google.com/gsi/client">` が含まれている
- [ ] redirect URI は使用していない（SPA構成のため不要）
- [ ] 「承認済みの JavaScript 生成元」のみ設定すればOK

### ✅ 3. ビルド確認

- [ ] `npm run build` が正常に完了する
- [ ] `dist` ディレクトリに `index.html` が生成される
- [ ] ビルドエラーがない

## GitHub リポジトリ作成

### ✅ 4. GitHub リポジトリの準備

- [ ] GitHub で新しいリポジトリを作成
  - リポジトリ名: `gmail-draft-helper`（推奨）
  - 説明: 「Gmail Draft Helper - Gmail下書きを一括作成・差込作成するアプリ」
  - 公開/非公開: 任意
- [ ] ローカルから GitHub にプッシュ:
  ```bash
  cd d:\gmail-draft-helper
  git init
  git add .
  git commit -m "Initial commit: Gmail Draft Helper"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git
  git push -u origin main
  ```

## Google Cloud Console 設定

### ✅ 5. OAuth Client ID の準備

- [ ] [Google Cloud Console](https://console.cloud.google.com/) にアクセス
- [ ] プロジェクトを選択（または新規作成）
- [ ] 「APIとサービス」→「認証情報」に移動
- [ ] OAuth 2.0 クライアント ID を作成（または既存のものを使用）
- [ ] アプリケーションの種類: 「ウェブ アプリケーション」
- [ ] 承認済みの JavaScript 生成元に以下を追加:
  - `http://localhost:3000`（ローカル開発用）
  - 本番URLは後で追加（Render デプロイ後に確認）

### ✅ 6. Gmail API の有効化

- [ ] 「APIとサービス」→「ライブラリ」に移動
- [ ] 「Gmail API」を検索して有効化

## Render デプロイ

### ✅ 7. Render アカウントの準備

- [ ] [Render](https://render.com) でアカウントを作成（GitHub アカウントでログイン可能）
- [ ] GitHub アカウントを Render に接続

### ✅ 8. Web Service の作成

- [ ] Render ダッシュボードで「New +」→「Web Service」を選択
- [ ] GitHub リポジトリ `gmail-draft-helper` を選択
- [ ] 以下の設定を入力:

  | 項目 | 値 |
  |------|-----|
  | Name | `gmail-draft-helper` |
  | Environment | `Node` |
  | Branch | `main` |
  | Root Directory | (空白) |
  | Build Command | `npm install && npm run build` |
  | Start Command | `npm start` (自動検出される場合もあります) |

- [ ] 「Advanced」→「Node Version」に `20.18.0` を設定（または自動検出）
- [ ] `package.json` に `start` スクリプトが定義されていることを確認

### ✅ 9. 環境変数の設定

- [ ] 「Environment」セクションに移動
- [ ] 環境変数を追加:
  - **Key**: `VITE_GOOGLE_CLIENT_ID`
  - **Value**: Google OAuth Client ID（例: `40580506792-xxxxx.apps.googleusercontent.com`）

### ✅ 10. デプロイの実行

- [ ] 「Create Static Site」をクリック
- [ ] ビルドが開始されることを確認
- [ ] ビルドログを確認（エラーがないか）
- [ ] デプロイが完了するまで待機（3-5分程度）

## デプロイ後の設定

### ✅ 11. 本番URLの確認

- [ ] Render ダッシュボードで生成されたURLを確認
  - Settings → URL
  - 例: `https://gmail-draft-helper.onrender.com`

### ✅ 12. Google Cloud Console に本番URLを追加

- [ ] Google Cloud Console に戻る
- [ ] OAuth 2.0 クライアント ID を編集
- [ ] 「承認済みの JavaScript 生成元」に Render の本番URLを追加
  - 例: `https://gmail-draft-helper.onrender.com`
  - **重要**: `https://` で始まり、末尾にスラッシュは不要
- [ ] 「保存」をクリック

## 動作確認

### ✅ 13. 基本動作確認

- [ ] 本番URLにアクセスできる
- [ ] アプリが正常に表示される
- [ ] エラーメッセージが表示されない

### ✅ 14. OAuth認証の確認

- [ ] 「下書きを作成」ボタンをクリック
- [ ] Google認証画面が表示される
- [ ] 認証を完了できる
- [ ] 認証後にアプリに戻る

### ✅ 15. Gmail下書き作成の確認

- [ ] メールアドレスを入力（一括モード）
- [ ] または Excel ファイルをアップロード（差込モード）
- [ ] 件名・本文を入力
- [ ] 「下書きを作成」をクリック
- [ ] Gmail の下書きフォルダに下書きが作成される

### ✅ 16. 差込機能の確認

- [ ] Excel ファイルをアップロード
- [ ] 件名・本文に差込タグ（例: `{会社名}`）を入力
- [ ] プレビューが正しく表示される
- [ ] 下書きが各行ごとに個別に作成される
- [ ] 空欄セルが正しく空文字として処理される

## 完了

すべてのチェック項目が完了したら、デプロイは成功です！

## トラブルシューティング

### OAuth エラーが発生する場合

**エラー**: `origin_mismatch` または `redirect_uri_mismatch`

**対処法**:
1. Google Cloud Console の「承認済みの JavaScript 生成元」を確認
2. Render で生成されたURLが正確に登録されているか確認
3. URLの末尾にスラッシュがないか確認
4. 数分待ってから再試行（反映に時間がかかる場合があります）

### 環境変数が読み込まれない場合

**対処法**:
1. Render ダッシュボードで環境変数を確認
2. 環境変数名が `VITE_GOOGLE_CLIENT_ID` であることを確認
3. 環境変数を変更した場合は、手動で再デプロイ:
   - Manual Deploy → Clear build cache & deploy
