# PazooBlogs
Instagram風ブログアプリ。スマホでの閲覧を意識したレスポンシブデザイン対応。

## 技術スタック
### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios

### Backend
- **Language**: Go
- **Framework**: Gin Web Framework
- **ORM**: GORM

### Database
- **Development**: MariaDB (XAMPP MySQL)
- **Production**: MariaDB (Sakura VPS)

## 開発環境構築手順

### 前提条件
以下のツールがインストールされていること。
- Go
- Node.js
- XAMPP (または MySQL/MariaDB 環境)
- Git

### 1. データベースの準備
1. XAMPPのMySQLを起動する。
2. phpMyAdmin等で以下のデータベースを作成する。
   - データベース名: `pazooblogs_db`
   - 照合順序: `utf8mb4_general_ci`

### 2. バックエンド (API) のセットアップ
```bash
cd backend

# モジュールのダウンロード
go mod tidy

# サーバー起動 (ポート 8080)
go run main.go
