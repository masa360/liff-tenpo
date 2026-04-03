/** ひらがなをカタカナに（検索正規化用・簡易） */
export function toKatakana(input: string): string {
  return input.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

/** 全角英数を半角に（電話など） */
export function normalizeQuery(raw: string): string {
  return toKatakana(raw.trim().toUpperCase()).replace(/\s+/g, '');
}
