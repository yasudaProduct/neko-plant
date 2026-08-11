# neko-plant ドキュメント

「猫と植物の暮らし」を共有するフォトSNS。Next.js 15 + Supabase。

## 目的別の入口

| やりたいこと | 読むもの |
| --- | --- |
| **開発を始める** | [02-development/setup.md](./02-development/setup.md) |
| **サービスの狙いを知る** | [01-product/service-description.md](./01-product/service-description.md) |
| **コードの全体像を掴む** | [03-architecture/overview.md](./03-architecture/overview.md) |
| **DBを変更する** | [04-operations/database.md](./04-operations/database.md) |
| **テストを書く・動かす** | [02-development/testing.md](./02-development/testing.md) |
| **用語がわからない** | [01-product/glossary.md](./01-product/glossary.md) |

> **初めて触る場合は [03-architecture/overview.md](./03-architecture/overview.md) の
> 「DBへの2つの経路」を先に読んでください。** Prisma は RLS をバイパスし、Supabase クライアントは
> RLS が適用されるという非対称性が、このプロジェクトの設計全体に効いています。

## 全ドキュメント

### 01-product — なにを作るか

| ファイル | 内容 |
| --- | --- |
| [service-description.md](./01-product/service-description.md) | サービス仕様。コンセプト、ユーザー動線、安全性表現の方針 |
| [glossary.md](./01-product/glossary.md) | 用語集 |

### 02-development — どう作業するか

| ファイル | 内容 |
| --- | --- |
| [setup.md](./02-development/setup.md) | 初回セットアップ手順と環境変数一覧 |
| [commands.md](./02-development/commands.md) | コマンド早見表 |
| [coding-guidelines.md](./02-development/coding-guidelines.md) | コーディング規約 |
| [testing.md](./02-development/testing.md) | Vitest / Playwright / pgTAP |

### 03-architecture — どう作られているか

| ファイル | 内容 |
| --- | --- |
| [overview.md](./03-architecture/overview.md) | 全体構成、DBへの2つの経路、リクエストの流れ |
| [data-model.md](./03-architecture/data-model.md) | ER図、テーブル一覧、共存実績の集計 |
| [auth.md](./03-architecture/auth.md) | Supabase Auth、同期トリガー、alias_id の設計 |
| [storage.md](./03-architecture/storage.md) | バケット構成、直接アップロードのフロー |
| [security.md](./03-architecture/security.md) | RLS・ストレージポリシー、防御の三層 |
| [ai-plant-identification.md](./03-architecture/ai-plant-identification.md) | AI植物判定 |

### 04-operations — どう運用するか

| ファイル | 内容 |
| --- | --- |
| [database.md](./04-operations/database.md) | マイグレーション運用ルール |
| [deployment.md](./04-operations/deployment.md) | Vercel + GitHub Actions |
| [admin.md](./04-operations/admin.md) | 管理者機能・モデレーション |

### 99-archive — 過去の記録

**現行仕様ではありません。** 完了した改修計画と対応済みの監査レポートを、経緯を残す目的で保管しています。
各ファイル冒頭に現行ドキュメントへの導線があります。

## ドキュメントの運用

- **このディレクトリが詳細ドキュメントの唯一の置き場**です
- ルートの `README.md` はサービス概要と最短の起動手順のみを持ち、詳細はここへ誘導します
- `CLAUDE.md` はAIエージェント向けの要約と絶対ルールで、詳細はここを参照します
- `.cursor/rules/neko-plant.mdc` は [02-development/coding-guidelines.md](./02-development/coding-guidelines.md) を参照します

同じ内容を複数箇所に書かず、**ここを更新すれば全部に効く**状態を保ってください。

### 更新が必要になるタイミング

| 変更 | 更新するドキュメント |
| --- | --- |
| テーブル・ポリシーの追加/変更 | [data-model.md](./03-architecture/data-model.md), [security.md](./03-architecture/security.md) + `supabase/tests/01_rls_structure.sql` |
| 一意インデックス・制約の追加/変更 | [data-model.md](./03-architecture/data-model.md), [database.md](./04-operations/database.md), [security.md](./03-architecture/security.md) + `supabase/tests/01_rls_structure.sql` の第7節と `plan()` |
| マスタデータの追加/変更 | [database.md](./04-operations/database.md#マスタデータの置き場) — 運用マスタはマイグレーション、UGCマスタは `seeds/` |
| 環境変数の追加 | [setup.md](./02-development/setup.md) + `.env.example` |
| npm script の追加 | [commands.md](./02-development/commands.md) |
| CI ワークフローの変更 | [deployment.md](./04-operations/deployment.md) |
| 認証・権限まわりの変更 | [auth.md](./03-architecture/auth.md), [admin.md](./04-operations/admin.md) |
