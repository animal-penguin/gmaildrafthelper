<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gmail Draft Helper

Gmailの下書きを一括作成・差し込み作成するためのアプリケーションです。

## 機能

- **一括同一文面（CC送信）モード**: 複数のメールアドレスをCCに追加した下書きを作成
- **Excel差込作成（個別送信）モード**: Excelファイルからデータを読み込み、個別に下書きを作成

## ローカルでの実行方法

### 前提条件

- Node.js (v18以上推奨)

### セットアップ手順

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
   
   `.env.local`ファイルをプロジェクトルートに作成し、以下の内容を追加してください：
   ```
   VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   ```
   
   Google Client IDの取得方法:
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクトを作成または選択
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
   - アプリケーションの種類で「ウェブ アプリケーション」を選択
   - 承認済みの JavaScript 生成元に `http://localhost:3000` を追加
   - 作成されたクライアント IDをコピーして `.env.local` に設定

3. **アプリの起動**
   ```bash
   npm run dev
   ```
   
   ブラウザで `http://localhost:3000` にアクセスします。

## 使用方法

1. モードを選択（一括同一文面 または Excel差込作成）
2. メールアドレスを入力、またはExcelファイルをアップロード
3. 件名と本文を入力
4. 「下書きを作成」ボタンをクリック
5. Google認証を完了（初回のみ）
6. Gmailの下書きフォルダを確認

## ビルド

本番環境用のビルド:
```bash
npm run build
```

ビルド結果のプレビュー:
```bash
npm run preview
```

## Render へのデプロイ

このアプリケーションは [Render](https://render.com/) に Web Service (Node) としてデプロイできます。

### デプロイ手順

#### 1. GitHub リポジトリの作成

```bash
# 新しいリポジトリを作成（例: gmail-draft-helper）
git init
git add .
git commit -m "Initial commit: Gmail Draft Helper"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git
git push -u origin main
```

#### 2. Render での設定

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を入力：
   - **Name**: `gmail-draft-helper` (任意)
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Root Directory**: (空白)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` (自動検出される場合もあります)
   - **Node Version**: `20.18.0` (または自動検出)

5. **環境変数の設定**:
   - **Key**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: あなたのGoogle OAuth Client ID

6. 「Create Web Service」をクリック

**注意**: `package.json` に `start` スクリプトが定義されていることを確認してください。このスクリプトは `serve` パッケージを使用して `dist` ディレクトリを配信します。

#### 3. Google Cloud Console での設定

デプロイが完了したら、本番環境のURLをGoogle OAuth設定に追加してください：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. OAuth 2.0 クライアント IDを編集
5. 「承認済みの JavaScript 生成元」に以下を追加：
   - `https://your-app-name.onrender.com` (Renderで生成されたURL)

#### 4. 動作確認

デプロイ完了後、以下を確認してください：

- ✅ 本番URLでアプリが表示される
- ✅ Google認証が正常に動作する
- ✅ Gmail下書きの作成が正常に動作する
- ✅ Excel差込機能が正常に動作する

### トラブルシューティング

#### OAuth エラーが発生する場合

**エラー**: `redirect_uri_mismatch` または `origin_mismatch`

**対処法**:
1. Google Cloud Consoleの「承認済みの JavaScript 生成元」に本番URLが正しく登録されているか確認
2. URLは `https://` で始まり、末尾にスラッシュがないことを確認
3. 環境変数 `VITE_GOOGLE_CLIENT_ID` が正しく設定されているか確認（Renderダッシュボードで確認）
4. ビルドが完了したら、ブラウザのキャッシュをクリアして再読み込み

#### ビルドエラーが発生する場合

**対処法**:
1. `package.json` の依存関係が正しくインストールされるか確認
2. Nodeバージョンが `.nvmrc` で指定されたバージョン（20.18.0）と一致しているか確認
3. ビルドログを確認してエラー内容を特定

#### 環境変数が読み込まれない場合

**対処法**:
1. Renderダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数名は `VITE_GOOGLE_CLIENT_ID`（`VITE_` プレフィックス必須）であることを確認
3. ビルド後、環境変数はビルド時に埋め込まれるため、変更後は再ビルドが必要

## 技術スタック

- **フロントエンド**: React 19, TypeScript, Vite 6
- **UI**: Tailwind CSS
- **認証**: Google Identity Services (OAuth 2.0)
- **API**: Gmail API
- **ファイル処理**: SheetJS (xlsx)
