# GitHub リポジトリ作成手順

このファイルでは、GitHub リポジトリを作成して Render にデプロイするための手順を説明します。

## 前提条件

- Git がインストールされている
- GitHub アカウントを持っている

## 手順

### 1. GitHub で新しいリポジトリを作成

1. [GitHub](https://github.com) にログイン
2. 右上の「+」→「New repository」をクリック
3. 以下の設定を入力:
   - **Repository name**: `gmail-draft-helper`（推奨）
   - **Description**: `Gmail Draft Helper - Gmail下書きを一括作成・差込作成するアプリケーション`
   - **Visibility**: Public または Private（任意）
   - **Initialize this repository with**: すべてチェックを外す（既にファイルがあるため）
4. 「Create repository」をクリック

### 2. ローカルリポジトリを初期化

プロジェクトディレクトリで以下のコマンドを実行:

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

### 3. 確認

GitHub でリポジトリが正しく作成され、ファイルがアップロードされていることを確認してください。

## 注意事項

### コミット前に確認すべき項目

- ✅ `.env.local` が `.gitignore` に含まれている（GitHubにプッシュされない）
- ✅ `node_modules` が `.gitignore` に含まれている
- ✅ `dist` が `.gitignore` に含まれている
- ✅ `CLIENT_ID` がソースコードにハードコードされていない
- ✅ 機密情報（API キーなど）が含まれていない

### 既にGitリポジトリが存在する場合

既にGitリポジトリが初期化されている場合は、以下のコマンドでリモートを追加:

```bash
# 既存のリモートを確認
git remote -v

# リモートが存在しない場合、追加
git remote add origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git

# リモートが既に存在する場合、URLを変更
git remote set-url origin https://github.com/YOUR_USERNAME/gmail-draft-helper.git

# プッシュ
git push -u origin main
```
