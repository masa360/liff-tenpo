/**
 * 親リポジトリの予約 API と同型のプロキシ呼び出し（独立コピー）
 */
export interface CreateReservationApiResponse {
  success: boolean;
  eventId?: string;
  assignedStaffName?: string;
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
