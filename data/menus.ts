/** 店舗用は単一リストで選ぶ（本家 LIFF の多段フローを単純化） */
export interface StoreMenu {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export const storeMenus: StoreMenu[] = [
  { id: 'cut-01', name: 'デザインカット', durationMinutes: 45, price: 5000 },
  { id: 'cut-color', name: 'カット ＋ カラー', durationMinutes: 120, price: 13200 },
  { id: 'color', name: 'リタッチカラー', durationMinutes: 90, price: 8200 },
  { id: 'perm', name: 'デザインパーマ', durationMinutes: 100, price: 9800 },
  { id: 'care', name: '炭酸ヘッドスパ', durationMinutes: 20, price: 2500 },
  { id: 'cut-care', name: 'カット ＋ ヘッドスパ', durationMinutes: 60, price: 7200 },
];
