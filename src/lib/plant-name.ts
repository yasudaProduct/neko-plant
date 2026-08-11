/**
 * 植物名の正規化。
 *
 * DB の一意インデックス plants_name_normalized_key の式と 1:1 で対応させる:
 *   PG  lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g')))
 *        └─ plantNameKey ─────────────────────────────────────────────────┘
 *              └─ normalizePlantName（表示名。大文字小文字は保持）────────┘
 *
 * normalize(NFKC) を最初に掛けるのが要点。全角スペース(U+3000)・NBSP・半角カナは
 * NFKC で半角スペース／全角カナに畳まれ、その後の \s+ で初めて拾える。
 * 順序を逆にすると「　」が空白として扱われない。
 *
 * この2関数とマイグレーションの式・src/lib/plant-name-query.ts の SQL は
 * 必ず同時に変更すること。片方だけ変えると「アプリは重複と判定しないのに
 * DB が 23505 を返す」状態になる。
 */

/** 保存する表示名。表記だけ揃え、大文字小文字は入力どおり残す */
export function normalizePlantName(name: string): string {
    return name.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** 重複判定・突き合わせ用のキー。DB の一意インデックスが作る値と一致する */
export function plantNameKey(name: string): string {
    return normalizePlantName(name).toLowerCase();
}
