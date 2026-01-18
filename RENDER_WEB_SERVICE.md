# Render Web Service (Node) デプロイ設定

このファイルでは、Render Web Service (Node) としてデプロイする際の設定を説明します。

## 変更内容

### package.json の変更

1. **`start` スクリプトを追加**:
   ```json
   "start": "serve -s dist"
   ```

2. **`serve` パッケージを dependencies に追加**:
   ```json
   "serve": "^14.2.4"
   ```

## Render Web Service 設定

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

### 環境変数設定

| Key | Value | 説明 |
|-----|-------|------|
| `VITE_GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Google OAuth Client ID |

**重要**: 
- 環境変数名は `VITE_` で始まる必要があります
- Render は自動的に `PORT` 環境変数を設定します（`serve` が自動的に読み取ります）

## serve パッケージについて

`serve` パッケージは、静的ファイルを配信するためのシンプルなサーバーです。

- **`-s` オプション**: SPA モード（すべてのルートを `index.html` にリダイレクト）
- **`dist`**: 配信するディレクトリ（Vite のビルド出力）
- **`PORT` 環境変数**: Render が自動的に設定するため、明示的な指定は不要

## デプロイ手順

1. Render ダッシュボードで「New +」→「Web Service」を選択
2. GitHub リポジトリを接続
3. 上記の設定を入力
4. 環境変数 `VITE_GOOGLE_CLIENT_ID` を設定
5. 「Create Web Service」をクリック

## 動作確認

デプロイ後、以下を確認してください：

- ✅ ビルドが正常に完了する
- ✅ `npm start` が正常に実行される
- ✅ 本番URLでアプリが表示される
- ✅ Google認証が正常に動作する

## トラブルシューティング

### npm start が存在しないエラー

**症状**: `npm start` が存在しないというエラーが表示される

**対処法**:
1. `package.json` に `start` スクリプトが定義されているか確認
2. `serve` パッケージが `dependencies` に含まれているか確認
3. `npm install` が正常に完了しているか確認

### ポートエラー

**症状**: ポートが既に使用されているというエラーが表示される

**対処法**:
- Render は自動的に `PORT` 環境変数を設定するため、通常は発生しません
- `serve` は `PORT` 環境変数を自動的に読み取ります

### ビルドは成功するがアプリが表示されない

**対処法**:
1. `dist` ディレクトリに `index.html` が存在するか確認
2. ビルドログでエラーがないか確認
3. `npm start` が正常に実行されているか確認（ログを確認）
