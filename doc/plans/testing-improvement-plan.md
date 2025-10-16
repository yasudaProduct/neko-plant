## テスト改善計画（neko-plant）

本ドキュメントは現状のテスト運用を踏まえ、短期〜中期での改善施策を示します。ユニット/E2E/CI/非機能の各側面での具体策を列挙し、実行順も提示します。

### 現状整理（観測）
- **ユニット（Vitest）**: `src/__test__/actions/*` を中心に、Prisma/Supabase をモックしてロジック検証が充実。`jsdom`/RTL利用、カバレッジはCodecov連携あり。
- **E2E（Playwright）**: 認証セットアップ（`auth.setup.ts`）でメール/パスワード認証を自動化し、`authenticated` と `no-auth` で主要フローを網羅（検索・登録・詳細・評価・管理者保護など）。`baseURL=3001` で dev サーバを起動して実行。
- **CI**: PR向け `Check`（lint/unit/build）と `Playwright Tests`（main/master向け）が分離。E2Eワークフローにシード前処理は未導入。
- **テストデータ**: `npm run seed:e2e` があり、Supabase Auth とDBへ必要データ投入が可能。

### 主な課題
1. **E2Eの安定性（CI）**: シード未実行でデータ前提が崩れる可能性。`headless: false` が混在し、CIでの挙動差/速度低下の懸念。
2. **カバレッジの明確な閾値未設定**: Codecov連携はあるが、Requiredチェック/閾値運用が不明確。
3. **非機能テスト不足**: a11y/パフォーマンス/ビジュアルリグレッションの自動化が未導入。
4. **テスト選択性と実行時間**: 変更影響に応じた選択実行や並列最適化が限定的。
5. **E2Eのブラウザ行列**: Chrome中心。将来的な互換性確保に向けた段階導入が未着手。

### 改善方針（要点）
- CIのE2E前処理に Prisma 生成 + シードを必須化し、`headless` をCIデフォルトで有効化。
- Codecovで閾値・Requiredチェックを設定し、段階的に目標を引き上げる。
- a11y/Perf/Visual を段階導入。まずは主要画面のa11yとLighthouse CIのしきい値設定から。
- 影響範囲に基づくテスト選択と、Playwright/Vitestの並列最適化を進める。

### 具体施策

#### 1) E2E安定化（最優先）
- `/.github/workflows/playwright.yml` に以下の前処理を追加:
  - `npx prisma generate`
  - `npm run seed:e2e`
- `playwright.config.ts`
  - CI時 `use: { headless: true }` を明示（現状 `no-auth` で `headless: false`）。
  - `workers` はCIで2、ローカル4を維持。
- `auth.setup.ts`
  - 認証ページのセレクタ/遷移待機は `findByRole` 相当の堅牢化（今はdata-testid中心。E2EはUI変更に強いセレクタを併用）。

#### 2) カバレッジ運用
- Codecov の `required` チェックを導入。
- 閾値（暫定）: プロジェクト総合 60% 以上、重要領域（`@/actions` 認証/評価/登録） 80% 以上。
- ステップアップ計画: Q+1で65%、Q+2で70%、安定後80%目標。

#### 3) 非機能テストの段階導入
- a11y: Playwright Axe(or `@axe-core/playwright`)を主要画面で実行、重大違反は失敗。
- Perf: Lighthouse CI をPRで実行（LCP/CLS/TTI しきい値ベースで警告→段階的にfail化）。
- Visual: Playwrightのスナップショットを主要UIに限定導入（差分許容値を小さく開始）。

#### 4) 実行時間短縮・選択実行
- 変更差分に応じて Vitest の対象を絞る（パスベース/タグベース）。
- Playwright は `--project` と `-g` を活用し、PRではスモーク、nightlyでフル実行。
- 並列度・シャーディングを段階的に最適化。

#### 5) ブラウザ行列の段階拡大
- `Desktop Chrome` → `Firefox` を追加（nightly）。安定後 `WebKit` も検討。

### 実行順（ロードマップ）
- **Phase 1（今週）**
  - Playwright CI に Prisma 生成 + シード追加
  - CIで headless 有効化（`no-auth` プロジェクト設定の上書き）
  - Codecov Required チェック導入（60%）
- **Phase 2（来週）**
  - a11y（主要画面）とスモークPerf（Lighthouse CI）導入
  - E2Eのセレクタ/待機安定化（`findByRole`ベースへの移行）
  - PRのE2Eをスモーク（主要シナリオのみ）、nightlyでフルへ分割
- **Phase 3（翌月）**
  - Visual Regressionの限定導入
  - Firefoxをnightly行列に追加
  - カバレッジ閾値 65% / 重要領域 80% 維持・改善
- **Phase 4（以降）**
  - 阻害要因の解消後、閾値70%へ引き上げ
  - WebKit導入の可否判断、Lighthouseしきい値の厳格化

### 運用ポリシー
- 本番Supabaseへの変更操作は厳禁。テストはローカル/検証環境。
- E2Eのデータは毎回シードで再現性を担保。
- フレークはまず待機/セレクタ修正、再発継続時は隔離と優先度付け。

### 参考コマンド
```bash
# シード（前処理）
npx prisma generate
npm run seed:e2e

# Playwright
npm run e2e
npm run e2e -- --project="no-auth"

# Vitest
npm run test
npm run test:coverage
```
