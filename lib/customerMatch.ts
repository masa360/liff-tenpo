import type { StoreCustomer } from '@/data/customers';
import { normalizeQuery } from '@/lib/katakanaSearch';

function compactDisplayName(s: string): string {
  return s.replace(/\s+/g, '');
}

/**
 * 店舗の名前入力向け候補。
 * - 1〜2文字入力: 先頭一致のみ（「た」なら「た/タ」で始まる人）
 * - 3文字以上: 部分一致も許可
 */
export function rankCustomersForPredict(rawInput: string, list: StoreCustomer[]): StoreCustomer[] {
  const raw = rawInput.trim();
  if (!raw) return [];

  const qNorm = normalizeQuery(raw);
  const rawCompact = raw.replace(/\s+/g, '');
  const strictPrefix = Math.max(qNorm.length, rawCompact.length) <= 2;

  const scored = list
    .map((c) => {
      const kana = normalizeQuery(c.searchKana);
      const nameFlat = compactDisplayName(c.displayName);
      const kanaPrefix = qNorm ? kana.startsWith(qNorm) : false;
      const kanaPartial = qNorm ? kana.includes(qNorm) : false;
      const namePrefix = rawCompact ? nameFlat.startsWith(rawCompact) : false;
      const namePartial = rawCompact ? nameFlat.includes(rawCompact) : false;

      if (strictPrefix && !(kanaPrefix || namePrefix)) {
        return { c, score: 0 };
      }

      let score = 0;
      if (kanaPrefix) score += 160;
      else if (kanaPartial) score += 70;
      if (namePrefix) score += 150;
      else if (namePartial) score += 80;

      return { c, score };
    })
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ad = a.c.lastReservation?.date ?? '';
    const bd = b.c.lastReservation?.date ?? '';
    if (ad && bd) return bd.localeCompare(ad);
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.c.displayName.localeCompare(b.c.displayName, 'ja');
  });

  return scored.map((x) => x.c);
}
