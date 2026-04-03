import type { StoreCustomer } from '@/data/customers';

/**
 * 店舗画面用: リピーター（前回データあり）を上に、来店が新しい順。
 * 前回なしは氏名順のまま下へ。
 */
export function sortCustomersForStoreUi(list: StoreCustomer[]): StoreCustomer[] {
  return [...list].sort((a, b) => {
    const ad = a.lastReservation?.date ?? '';
    const bd = b.lastReservation?.date ?? '';
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    if (ad && bd) return bd.localeCompare(ad);
    return a.displayName.localeCompare(b.displayName, 'ja');
  });
}
