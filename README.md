# Playwright Excel UI Test Automation

Docker上で動作するPlaywright UIテスト自動化システム。Excelファイルでテストケースを管理し、定期実行が可能です。

## 機能

- Excelファイルからテストケース読み込み
- 複数ブラウザでのテスト実行
- 定期実行（cron）
- HTMLレポート生成
- 手動実行API

## 使用方法

### 0. 事前作業（初回のみ）

```bash
# Dockerイメージをビルド
docker-compose build
```

### 1. 起動

```bash
# 定期実行モード
docker-compose up -d

# 手動実行モード
docker-compose --profile manual up test-runner

# Windows環境でのダブルクリック実行
run-test.bat
```

### 2. Excelテストケース作成

`testcases/` フォルダに以下の形式でExcelファイルを配置：

| caseId | description | action | selector | value | expect |
|--------|-------------|--------|----------|-------|--------|
| TC01 | ログイン | goto | https://example.com/login | | |
| TC01 | | fill | #username | testuser | |
| TC01 | | click | #login-button | | |

### 3. 対応アクション

- `goto`: ページ移動
- `fill`: 入力フィールド
- `click`: クリック
- `asserttext`: テキスト確認
- `assertvisible`: 要素表示確認
- `wait`: 待機
- `type`: タイピング
- `select`: セレクトボックス
- `hover`: ホバー
- `screenshot`: スクリーンショット

### 4. 手動実行

```bash
# テスト実行
curl -X POST http://localhost:9323/run-tests

# ステータス確認
curl http://localhost:9323/status
```

### 5. レポート確認

- HTML: `reports/html/index.html`
- JUnit: `reports/junit.xml`
- JSON: `reports/results.json`

## 環境変数

- `SCHEDULE_ENABLED`: 定期実行有効化 (true/false)
- `CRON_SCHEDULE`: cron形式のスケジュール (デフォルト: "0 2 * * *")

## ディレクトリ構成

```
├── testcases/          # Excelテストケース
├── tests/              # Playwrightテスト
├── scripts/            # ユーティリティ
├── reports/            # テスト結果
└── docker-compose.yml  # Docker設定
```