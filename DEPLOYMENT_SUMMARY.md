# Render デプロイ準備 - 完了報告

## 変更ファイル一覧

### 修正したファイル

1. **`App.tsx`**
   - **変更内容**: CLIENT_ID のハードコードを削除（環境変数のみに依存）
   - **変更理由**: セキュリティ向上と本番環境対応のため

2. **`.gitignore`**
   - **変更内容**: `.env.local` と `.env*.local` を明示的に追加
   - **変更理由**: 機密情報を GitHub にコミットしないようにするため

3. **`package.json`**
   - **変更内容**: 
     - `engines` フィールドを追加（Node >=20.0.0, npm >=10.0.0）
     - `start` スクリプトを追加（`serve -s dist`）
     - `serve` パッケージを dependencies に追加
   - **変更理由**: Render Web Service (Node) で動作させるため

4. **`README.md`**
   - **変更内容**: Render デプロイ手順とトラブルシューティングを追加
   - **変更理由**: デプロイ方法を明確にするため

### 新規作成したファイル

1. **`.env.example`**
   - **内容**: 環境変数のテンプレートファイル
   - **用途**: 他の開発者が環境変数を設定する際の参考

2. **`.nvmrc`**
   - **内容**: Node バージョン指定（20.18.0）
   - **用途**: Render で使用する Node バージョンを指定

3. **`DEPLOY.md`**
   - **内容**: 詳細なデプロイ手順書
   - **用途**: デプロイ時の参考資料

4. **`DEPLOYMENT_CHECKLIST.md`**
   - **内容**: デプロイ前後のチェックリスト
   - **用途**: デプロイ作業時の確認項目

5. **`RENDER_SETUP.md`**
   - **内容**: Render 設定のまとめ
   - **用途**: Render 設定の参照用

6. **`GITHUB_SETUP.md`**
   - **内容**: GitHub リポジトリ作成手順
   - **用途**: GitHub リポジトリ作成時の参考

7. **`vite-env.d.ts`**
   - **内容**: Vite 環境変数の型定義
   - **用途**: TypeScript の型チェック用

## 変更内容の詳細

### 1. App.tsx の変更

**変更前**:
```typescript
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '40580506792-3prds27b576usd5du0nh6vtcamharnne.apps.googleusercontent.com';
```

**変更後**:
```typescript
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
```

**変更理由**: 
- ハードコードされた Client ID を削除
- 本番環境では必ず環境変数から読み込むように変更
- セキュリティ向上

### 2. 環境変数検証の改善

**変更前**:
```typescript
if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE' || !CLIENT_ID.includes('.apps.googleusercontent.com')) {
  alert("エラー: Google OAuth Client IDが正しく設定されていません。.env.localファイルにVITE_GOOGLE_CLIENT_IDを設定してください。");
  return;
}
```

**変更後**:
```typescript
if (!CLIENT_ID || !CLIENT_ID.includes('.apps.googleusercontent.com')) {
  alert("エラー: Google OAuth Client IDが正しく設定されていません。\n環境変数 VITE_GOOGLE_CLIENT_ID を設定してください。\n\nローカル環境: .env.localファイル\n本番環境: Renderの環境変数設定");
  return;
}
```

**変更理由**:
- より分かりやすいエラーメッセージに変更
- ローカルと本番環境の両方に対応する説明を追加

## Render 設定内容まとめ

### Web Service (Node) 設定

```
Name: gmail-draft-helper
Environment: Node
Branch: main
Root Directory: (空白)
Build Command: npm install && npm run build
Start Command: npm start
Node Version: 20.18.0 (.nvmrc から自動検出)
Auto-Deploy: Yes (推奨)
```

**重要**: 
- `npm start` スクリプトが `package.json` に定義されている必要があります
- `start` スクリプトは `serve -s dist` を実行し、`dist` ディレクトリを配信します
- `serve` パッケージは `PORT` 環境変数を自動的に読み取ります（Render が自動設定）

### 環境変数設定

```
Key: VITE_GOOGLE_CLIENT_ID
Value: your-google-client-id.apps.googleusercontent.com
```

**重要**: 
- 環境変数名は `VITE_` で始まる必要があります
- Render で環境変数を設定する際は、ビルド前に設定する必要があります
- 環境変数を変更したら、手動で再デプロイが必要です

## Google Cloud Console 側で設定すべき項目

### OAuth 2.0 クライアント ID の設定

1. **承認済みの JavaScript 生成元**
   - `http://localhost:3000` (ローカル開発用)
   - `https://your-app-name.onrender.com` (本番環境のURL - Render デプロイ後に追加)

2. **承認済みのリダイレクト URI**
   - **不要** (Google Identity Services を使用するため、redirect URI は不要)

3. **Gmail API の有効化**
   - 「APIとサービス」→「ライブラリ」→「Gmail API」を有効化

### デプロイ後の設定手順

1. Render でデプロイが完了したら、生成されたURLを確認
   - 例: `https://gmail-draft-helper.onrender.com`
2. Google Cloud Console に戻る
3. OAuth 2.0 クライアント ID を編集
4. 「承認済みの JavaScript 生成元」に本番URLを追加
5. **重要**: URLは `https://` で始まり、末尾にスラッシュは不要
6. 「保存」をクリック
7. 数分待ってから本番環境で動作確認

## トラブルシューティング（OAuth エラー時）

### エラー: `origin_mismatch`

**原因**: Google Cloud Console の「承認済みの JavaScript 生成元」に本番URLが登録されていない

**対処法**:
1. Render で生成されたURLを確認（Settings → URL）
2. Google Cloud Console の「承認済みの JavaScript 生成元」に正確なURLを追加
3. URLの形式: `https://your-app-name.onrender.com`（末尾にスラッシュなし）
4. 変更後、数分待ってから再試行（反映に時間がかかる場合があります）

### エラー: `Invalid client ID`

**原因**: 環境変数 `VITE_GOOGLE_CLIENT_ID` が正しく設定されていない

**対処法**:
1. Render ダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数名が `VITE_GOOGLE_CLIENT_ID` であることを確認（`VITE_` プレフィックス必須）
3. 環境変数の値が Client ID であることを確認（`.apps.googleusercontent.com` で終わる）
4. 環境変数を変更した場合は、手動で再デプロイが必要:
   - Manual Deploy → Clear build cache & deploy

### エラー: `redirect_uri_mismatch`

**注意**: このエラーは通常発生しません（Google Identity Services は redirect URI を使用しないため）

**対処法**:
- 「承認済みのリダイレクト URI」は設定不要です
- エラーが発生する場合は、Client ID の設定を確認してください

### ビルドエラー

**対処法**:
1. ビルドログを確認してエラー内容を特定
2. Node バージョンが `.nvmrc` で指定されたバージョンと一致しているか確認
3. `package.json` の依存関係が正しく定義されているか確認
4. Build Command を `npm ci && npm run build` に変更してみる

### 環境変数が読み込まれない

**対処法**:
1. Render ダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数名が `VITE_GOOGLE_CLIENT_ID` であることを確認
3. 環境変数を変更したら、必ず再デプロイする（ビルド時に埋め込まれるため）
4. ビルドログで環境変数が読み込まれているか確認（ビルドログには表示されませんが、ビルドは成功するはずです）

## デプロイ後の確認項目

### ✅ 基本動作確認

- [ ] 本番URLにアクセスできる
- [ ] アプリが正常に表示される
- [ ] エラーメッセージが表示されない

### ✅ OAuth認証の確認

- [ ] 「下書きを作成」ボタンをクリック
- [ ] Google認証画面が表示される
- [ ] 認証を完了できる
- [ ] 認証後にアプリに戻る
- [ ] エラーが表示されない

### ✅ Gmail下書き作成の確認

- [ ] 一括モード: メールアドレスを入力して下書きが作成される
- [ ] 差込モード: Excelファイルをアップロードして下書きが作成される
- [ ] Gmailの下書きフォルダに下書きが正しく作成される

### ✅ 差込機能の確認

- [ ] Excelファイルの読み込みが正常に動作する
- [ ] プレビューが正しく表示される
- [ ] 各行ごとに個別に下書きが作成される
- [ ] 空欄セルが正しく空文字として処理される
- [ ] 未定義タグの警告が表示される（該当する場合）

## GitHub リポジトリ作成コマンド（まとめ）

```bash
cd d:\gmail-draft-helper

# Git リポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Gmail Draft Helper

- React + TypeScript + Vite 構成
- Google Identity Services による OAuth 認証
- Gmail API による下書き作成機能
- Excel ファイルからの差込機能
- Render デプロイ対応"

# ブランチ名を main に変更
git branch -M main

# GitHub リモートリポジトリを追加（YOUR_USERNAME をあなたのGitHubユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git

# GitHub にプッシュ
git push -u origin main
```

## 次のステップ

1. **GitHub リポジトリを作成**（上記コマンドを実行）
2. **Render で Static Site を作成**（`DEPLOY.md` を参照）
3. **環境変数を設定**（`VITE_GOOGLE_CLIENT_ID`）
4. **デプロイを実行**
5. **Google Cloud Console に本番URLを追加**
6. **動作確認**

すべての準備が完了しました！
