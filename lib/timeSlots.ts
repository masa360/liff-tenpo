/** 30分刻みの枠（店舗営業に合わせて後から調整） */
export function buildTimeSlots(start = '10:00', end = '20:00'): string[] {
  const out: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur < endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += 30;
  }
  return out;
}
