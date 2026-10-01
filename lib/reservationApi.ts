/**
 * 親リポジトリの予約 API と同型のプロキシ呼び出し（独立コピー）
 */
import type { GasStoreCustomerRow } from './gasCustomers';

export interface CreateReservationApiResponse {
  success: boolean;
  eventId?: string;
  assignedStaffName?: string;
  error?: string;
}

export interface ListStoreCustomersApiResponse {
  success: boolean;
  customers?: GasStoreCustomerRow[];
  error?: string;
}

export interface RegisterStoreCustomerApiResponse {
  success: boolean;
  customerId?: string;
  displayName?: string;
  searchKana?: string;
  error?: string;
}

export async function callReservationApi<T>(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = { success: false, error: '応答の解析に失敗しました' } as T;
  }
  return { ok: res.ok, status: res.status, data };
}

// ============================================================
// スタッフ設定（スプレッドシート「スタッフ設定」シート）
// ============================================================

export interface StaffFromGas {
  id: string;
  name: string;
  furigana: string;
  shiftStart: string;
  shiftEnd: string;
  calendarId: string;
  order: number;
}

export interface GetStaffApiResponse {
  success: boolean;
  staff?: StaffFromGas[];
  error?: string;
}

/** GAS の `getStaff` から「スタッフ設定」シートの内容を取得 */
export async function fetchStaffFromGas(): Promise<
  | { ok: true; staff: StaffFromGas[] }
  | { ok: false; error: string }
> {
  const { ok, data } = await callReservationApi<GetStaffApiResponse>({
    action: 'getStaff',
  });
  if (ok && data.success && Array.isArray(data.staff)) {
    return { ok: true, staff: data.staff };
  }
  const err =
    data && typeof data === 'object' && 'error' in data && data.error
      ? String(data.error)
      : 'スタッフ設定の取得に失敗しました';
  return { ok: false, error: err };
}

export async function fetchStoreCustomersFromGas(): Promise<
  | { ok: true; customers: NonNullable<ListStoreCustomersApiResponse['customers']> }
  | { ok: false; error: string }
> {
  const { ok, data } = await callReservationApi<ListStoreCustomersApiResponse>({
    action: 'listStoreCustomers',
  });
  if (ok && data.success && data.customers) {
    return { ok: true, customers: data.customers };
  }
  const err =
    data && typeof data === 'object' && 'error' in data && data.error
      ? String(data.error)
      : '顧客一覧の取得に失敗しました';
  return { ok: false, error: err };
}

export async function registerStoreCustomerOnGas(params: {
  displayName: string;
  searchKana?: string;
  phone?: string;
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const { ok, data } = await callReservationApi<RegisterStoreCustomerApiResponse>({
    action: 'registerStoreCustomer',
    displayName: params.displayName,
    searchKana: params.searchKana ?? params.displayName,
    phone: params.phone ?? '',
  });
  if (ok && data.success && data.customerId) {
    return { success: true, customerId: data.customerId };
  }
  const err =
    data && typeof data === 'object' && data.error ? String(data.error) : '顧客登録に失敗しました';
  return { success: false, error: err };
}

export async function createReservationOnGas(params: {
  customerName: string;
  menuName: string;
  durationMinutes: number;
  price: number;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  notes: string;
  /** 店舗マスタの顧客 ID（GAS の Reservations「顧客ID」列） */
  customerId?: string;
}): Promise<{ success: boolean; error?: string; eventId?: string }> {
  const { ok, data } = await callReservationApi<CreateReservationApiResponse>({
    action: 'createReservation',
    customerName: params.customerName,
    menuName: params.menuName,
    durationMinutes: params.durationMinutes,
    price: params.price,
    staffId: params.staffId,
    staffName: params.staffName,
    date: params.date,
    time: params.time,
    notes: params.notes,
    lineUserId: '',
    lineDisplayName: '',
    customerId: params.customerId ?? '',
  });

  if (ok && data.success) {
    return { success: true, eventId: data.eventId };
  }
  const err =
    data && typeof data === 'object' && data.error
      ? String(data.error)
      : '予約の登録に失敗しました';
  return { success: false, error: err };
}

// ============================================================
// キャンセル機能
// ============================================================

export interface CancellableReservation {
  eventId: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm
  menuName: string;
  staffId: string;
  title: string;
}

export interface GetCancellableReservationsApiResponse {
  success: boolean;
  reservations?: CancellableReservation[];
  error?: string;
}

export async function getCancellableReservations(params: {
  customerId?: string;
  displayName?: string;
}): Promise<CancellableReservation[]> {
  const { ok, data } = await callReservationApi<GetCancellableReservationsApiResponse>({
    action: 'getCancellableReservations',
    customerId: params.customerId ?? '',
    displayName: params.displayName ?? '',
  });
  if (ok && data.success && data.reservations) {
    return data.reservations;
  }
  throw new Error(data?.error ?? '予約一覧の取得に失敗しました');
}

export async function cancelReservation(eventId: string): Promise<void> {
  const { ok, data } = await callReservationApi<{ success: boolean; error?: string }>({
    action: 'cancelReservation',
    eventId,
  });
  if (!ok || !data.success) {
    throw new Error(data?.error ?? 'キャンセルに失敗しました');
  }
}
