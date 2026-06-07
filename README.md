# TabiTree - みんなで作る、旅行マップ

TabiTree（タビツリー）は、リアルタイムで友達と位置情報を共有しながら、旅行のピン（スポット）を追加し、ルートを最適化できるWebアプリケーションです。

---

## 🚀 セットアップ手順（接続と反映）

本アプリを実際に動かす（接続・反映する）には、**Supabase（データベース）** と **Google Maps API（地図表示）** の設定が必要です。

### 1. データベース（Supabase）の準備

1. **Supabaseプロジェクトの作成**:
   [Supabase](https://supabase.com/) にサインインし、新しいプロジェクトを作成します。
2. **データベーススキーマの適用**:
   - Supabase管理画面の左メニューから **SQL Editor** を開きます。
   - `New query` を作成し、プロジェクト内にある [supabase/schema.sql](file:///C:/Users/seya/.gemini/antigravity/scratch/tabitree/supabase/schema.sql) の内容をすべて貼り付けて、**Run** を実行します。
   - これにより、必要なテーブル（`groups`, `pins`, `group_members`, `routes`, `member_locations`）、RLSポリシー、リアルタイム同期（Realtime）、および画像アップロード用のストレージバケット（`pin-photos`）が一括で作成されます。
3. **APIキーの取得**:
   - Supabase管理画面の **Settings > API** を開きます。
   - `Project URL` と `anon public` キーの値をコピーしておきます。

### 2. Google Maps API の準備

1. **Google Cloud Console でのプロジェクト設定**:
   [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成します。
2. **APIの有効化**:
   ライブラリから以下のAPIを有効化してください：
   - **Maps JavaScript API**
   - **Directions API** (ルートの算出用)
3. **APIキーの作成と制限**:
   - `認証情報` からAPIキーを作成します。
   - 本番で公開する場合は、APIキーの制限を設定することを推奨します。

---

## 🛠️ ローカル環境での起動

1. **環境変数の設定**:
   - プロジェクトのルートディレクトリにある `.env.local.example` をコピーして、新規に `.env.local` という名前のファイルを作成します。
   - コピーした値（Supabase URL、Anonキー、Google Maps APIキー）を自分のキーに書き換えます。

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
   ```

2. **依存パッケージのインストール**:
   ```bash
   npm install
   ```

3. **開発サーバーの起動**:
   ```bash
   npm run dev
   ```

   起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。
