import type { StoreMenu } from './menus';
import type { StoreStaff } from './staff';

/** 来店者。GAS 取得失敗時のみフォールバックとして `storeCustomers` を使う */
export interface StoreCustomer {
  id: string;
  /** 画面上の氏名 */
  displayName: string;
  /**
   * 検索用ヨミ（カタカナ推奨。ひらがなのみでも可）
   * 例: ヤマダハナコ
   */
  searchKana: string;
  phone?: string;
  /** 前回の予約内容（あれば「前回と同じ」分岐に使う） */
  lastReservation?: {
    menuId: StoreMenu['id'];
    staffId: StoreStaff['id'];
    /** 前回来店日 YYYY-MM-DD */
    date: string;
  };
}

export const storeCustomers: StoreCustomer[] = [
  {
    id: 'c-001',
    displayName: '山田 花子',
    searchKana: 'ヤマダハナコ',
    phone: '09011112222',
    lastReservation: {
      menuId: 'cut-01',
      staffId: 'staff-01',
      date: '2026-03-15',
    },
  },
  {
    id: 'c-002',
    displayName: '佐藤 健',
    searchKana: 'サトウケン',
    phone: '08033334444',
    lastReservation: {
      menuId: 'cut-color',
      staffId: 'staff-00',
      date: '2026-02-20',
    },
  },
  {
    id: 'c-003',
    displayName: '鈴木 美咲',
    searchKana: 'スズキミサキ',
    lastReservation: undefined,
  },
  {
    id: 'c-004',
    displayName: '高橋 みお',
    searchKana: 'タカハシミオ',
    phone: '07055556666',
    lastReservation: {
      menuId: 'perm',
      staffId: 'staff-02',
      date: '2026-03-28',
    },
  },
];
