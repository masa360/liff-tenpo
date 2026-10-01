import type { StoreCustomer } from '@/data/customers';
import type { StoreMenu } from '@/data/menus';
import type { StoreStaff } from '@/data/staff';

/** GAS `listStoreCustomers` の 1 行 */
export type GasStoreCustomerRow = {
  customerId: string;
  displayName: string;
  searchKana: string;
  phone?: string;
  lastReservation?: {
    date: string;
    menuName: string;
    staffId: string;
  } | null;
};

/**
 * GAS の配列を StoreCustomer に変換。メニュー名が `menus` と一致しない場合は前回情報は付けない。
 */
export function gasRowsToStoreCustomers(
  rows: GasStoreCustomerRow[],
  menus: StoreMenu[],
  staffList: { id: StoreStaff['id'] }[],
): StoreCustomer[] {
  const staffIds = new Set(staffList.map((s) => s.id));

  return rows.map((r) => {
    const last = r.lastReservation;
    let lastReservation: StoreCustomer['lastReservation'] = undefined;
    if (last && last.date && last.menuName) {
      const menu = menus.find((m) => m.name === last.menuName);
      const sid = staffIds.has(last.staffId as StoreStaff['id'])
        ? (last.staffId as StoreStaff['id'])
        : ('staff-00' as StoreStaff['id']);
      if (menu) {
        lastReservation = {
          menuId: menu.id,
          staffId: sid,
          date: last.date,
        };
      }
    }

    return {
      id: r.customerId,
      displayName: r.displayName,
      searchKana: r.searchKana || '',
      phone: r.phone || undefined,
      lastReservation,
    };
  });
}
