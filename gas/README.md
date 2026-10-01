# store-booking/gas — 店舗用GASの置き場所の案内

> **ここには GAS に貼る正本を置かない。**（2026-10-02 整理）

店舗用GASに貼るファイルは、すべて本体リポジトリ（`masa360/LINE-reserve`）の次のフォルダにある。

```
reserve-liff/gas/reservation-only-user-and-store-v4/
├── Code.store.gs          … 店舗用GASのコード
└── StoreBookingPage.html  … 店舗用画面（GAS の HTML ファイル名は「StoreBookingPage」）
```

- 店舗用画面は **GAS の HTML 版が標準**。顧客ごとの Next.js アプリ（この `store-booking/`）は作らない。
  このフォルダの Next.js アプリは、見た目を作り込みたい顧客向けの**オプション（見本）**として残している。
- 店舗用画面のスタッフは「スタッフ設定」シートから自動で読む（v3〜）。顧客ごとに書き換えるのはメニュー（`MENUS`）だけ。
- 構築手順は `reserve-liff/docs/開発資料/GAS_設定手順マニュアル.md` と `納品チェックリスト.md`。

## このフォルダに残しているもの

| ファイル | 内容 |
|---|---|
| `old/StoreBookingPage_v1_原本.html` | 店舗用画面の v1（notes バグあり）。履歴として保管 |
| `v4移行手順.md` | 2026-06 に Hair Boutique の店舗用GASを v4 に移行したときの記録 |
