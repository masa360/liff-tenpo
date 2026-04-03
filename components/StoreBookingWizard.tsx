'use client';

import { useMemo, useState } from 'react';
import { storeCustomers, type StoreCustomer } from '@/data/customers';
import { storeMenus } from '@/data/menus';
import { storeStaffList } from '@/data/staff';
import { rankCustomersForPredict } from '@/lib/customerMatch';
import { sortCustomersForStoreUi } from '@/lib/customerSort';
import { createReservationOnGas } from '@/lib/reservationApi';
import { buildTimeSlots } from '@/lib/timeSlots';

type Step = 'customer' | 'repeat_choice' | 'menu' | 'datetime' | 'confirm';

/** ステップバー用（repeat_choice は「お客様」段階に含める） */
function toProgressStep(s: Step): 'customer' | 'menu' | 'datetime' | 'confirm' {
  if (s === 'repeat_choice') return 'customer';
  return s;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 一覧用: 前回の一行サマリー */
function formatLastVisitLine(c: StoreCustomer): string | null {
  if (!c.lastReservation) return null;
  const menu = storeMenus.find((m) => m.id === c.lastReservation!.menuId);
  const d = c.lastReservation.date.replace(/-/g, '/');
  return menu ? `前回 ${d} · ${menu.name}` : `前回 ${d}`;
}

export default function StoreBookingWizard() {
  const [step, setStep] = useState<Step>('customer');
  const [kanaInput, setKanaInput] = useState('');
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [useLastContent, setUseLastContent] = useState<boolean | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>('staff-00');
  const [date, setDate] = useState(todayYmd());
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inputTrim = kanaInput.trim();
  const { repeatersFirst, othersFirst, searchRanked } = useMemo(() => {
    if (!inputTrim) {
      const sorted = sortCustomersForStoreUi(storeCustomers);
      return {
        repeatersFirst: sorted.filter((c) => !!c.lastReservation),
        othersFirst: sorted.filter((c) => !c.lastReservation),
        searchRanked: null as StoreCustomer[] | null,
      };
    }
    return {
      repeatersFirst: [] as StoreCustomer[],
      othersFirst: [] as StoreCustomer[],
      searchRanked: rankCustomersForPredict(kanaInput, storeCustomers),
    };
  }, [inputTrim, kanaInput]);

  const predictTop = useMemo(
    () => (searchRanked ? searchRanked.slice(0, 8) : []),
    [searchRanked],
  );

  const selectedMenu = useMemo(
    () => storeMenus.find((m) => m.id === menuId) ?? null,
    [menuId],
  );
  const selectedStaff = useMemo(
    () => storeStaffList.find((s) => s.id === staffId) ?? null,
    [staffId],
  );

  const timeSlots = useMemo(() => buildTimeSlots(), []);

  function resetAll() {
    setStep('customer');
    setKanaInput('');
    setCustomer(null);
    setIsNewCustomer(false);
    setNewDisplayName('');
    setUseLastContent(null);
    setMenuId(null);
    setStaffId('staff-00');
    setDate(todayYmd());
    setTime(null);
    setResultMsg(null);
  }

  function pickCustomer(c: StoreCustomer) {
    setKanaInput('');
    setCustomer(c);
    setIsNewCustomer(false);
    setNewDisplayName('');
    setUseLastContent(null);
    setMenuId(null);
    setStaffId('staff-00');
    if (c.lastReservation) {
      setStep('repeat_choice');
    } else {
      setStep('menu');
    }
  }

  function startNewCustomer() {
    setCustomer(null);
    setIsNewCustomer(true);
    setNewDisplayName('');
    setUseLastContent(null);
    setMenuId(null);
    setStaffId('staff-00');
    setStep('menu');
  }

  function applyLastReservation() {
    if (!customer?.lastReservation) return;
    setMenuId(customer.lastReservation.menuId);
    setStaffId(customer.lastReservation.staffId);
  }

  function handleRepeatChoice(same: boolean) {
    if (!customer) return;
    setUseLastContent(same);
    if (same) {
      applyLastReservation();
      setStep('datetime');
    } else {
      setMenuId(null);
      setStaffId('staff-00');
      setStep('menu');
    }
  }

  function goMenuNext() {
    if (isNewCustomer) {
      if (!newDisplayName.trim()) {
        setResultMsg({ ok: false, text: 'お客様のお名前を入力してください。' });
        return;
      }
    }
    if (!menuId || !staffId) {
      setResultMsg({ ok: false, text: 'メニューと担当を選んでください。' });
      return;
    }
    setResultMsg(null);
    setStep('datetime');
  }

  function goDatetimeNext() {
    if (!time) {
      setResultMsg({ ok: false, text: '開始時刻を選んでください。' });
      return;
    }
    setResultMsg(null);
    setStep('confirm');
  }

  async function submitReservation() {
    if (!selectedMenu || !selectedStaff || !time) return;
    const displayName = isNewCustomer
      ? newDisplayName.trim()
      : customer?.displayName ?? '';
    if (!displayName) {
      setResultMsg({ ok: false, text: 'お客様名がありません。' });
      return;
    }

    setSubmitting(true);
    setResultMsg(null);
    const cid = customer?.id ?? 'new';
    const notes = [
      '店舗端末 store-booking',
      `顧客ID:${cid}`,
      isNewCustomer ? '新規' : '既存',
      useLastContent === true ? '前回同じ内容' : useLastContent === false ? '内容変更' : '',
    ]
      .filter(Boolean)
      .join(' / ');

    const res = await createReservationOnGas({
      customerName: displayName,
      menuName: selectedMenu.name,
      durationMinutes: selectedMenu.durationMinutes,
      price: selectedMenu.price,
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      date,
      time,
      notes,
    });

    setSubmitting(false);
    if (res.success) {
      setResultMsg({
        ok: true,
        text: `登録しました。${res.eventId ? `イベントID: ${res.eventId}` : ''}`,
      });
      resetAll();
    } else {
      setResultMsg({ ok: false, text: res.error ?? '登録に失敗しました。' });
    }
  }

  function backFromMenu() {
    setResultMsg(null);
    if (isNewCustomer) {
      setIsNewCustomer(false);
      setNewDisplayName('');
      setStep('customer');
      return;
    }
    if (customer?.lastReservation) {
      setStep('repeat_choice');
      setMenuId(null);
      setStaffId('staff-00');
      setUseLastContent(null);
    } else {
      setCustomer(null);
      setStep('customer');
    }
  }

  function backFromDatetime() {
    setResultMsg(null);
    /** 「前回と同じ」で来た場合はメニュー画面をスキップしているので、前回選択へ戻す */
    if (useLastContent === true && customer?.lastReservation) {
      setStep('repeat_choice');
      setTime(null);
      return;
    }
    setStep('menu');
  }

  const lastMenuName = customer?.lastReservation
    ? storeMenus.find((m) => m.id === customer.lastReservation!.menuId)?.name
    : undefined;
  const lastStaffName = customer?.lastReservation
    ? storeStaffList.find((s) => s.id === customer.lastReservation!.staffId)?.name
    : undefined;
  const lastDurationMin = customer?.lastReservation
    ? storeMenus.find((m) => m.id === customer.lastReservation!.menuId)?.durationMinutes
    : undefined;

  function backFromConfirm() {
    setResultMsg(null);
    setStep('datetime');
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
        <p className="text-xs font-semibold tracking-wider text-[var(--ac-base)]">STORE</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--tx-primary)]">店舗予約入力</h1>
        <p className="mt-2 text-sm text-[var(--tx-secondary)]">
          <strong className="text-[var(--tx-primary)]">リピーターは一覧の上に出ます。</strong>
          ヨミで検索 → 前回どおりかだけ選ぶ → 日時で完了。LINE 不要の店舗専用フローです。
        </p>
      </header>

      <ol className="mb-6 flex gap-2 text-[11px] font-medium text-[var(--tx-secondary)]">
        {(['customer', 'menu', 'datetime', 'confirm'] as const).map((key, i) => {
          const order = ['customer', 'menu', 'datetime', 'confirm'] as const;
          const progress = toProgressStep(step);
          const idx = order.indexOf(progress);
          const active = key === progress;
          const done = order.indexOf(key) < idx;
          return (
            <li
              key={key}
              className={`flex-1 rounded-lg px-2 py-1.5 text-center ${
                active
                  ? 'bg-[var(--ac-light)] text-[var(--tx-primary)]'
                  : done
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-white/60'
              }`}
            >
              {i + 1}.{' '}
              {key === 'customer'
                ? 'お客様'
                : key === 'menu'
                  ? 'メニュー'
                  : key === 'datetime'
                    ? '日時'
                    : '確定'}
            </li>
          );
        })}
      </ol>

      {resultMsg ? (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            resultMsg.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'
          }`}
        >
          {resultMsg.text}
        </div>
      ) : null}

      {step === 'customer' ? (
        <section className="space-y-4 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
          <h2 className="text-sm font-bold">お客様を選ぶ</h2>
          <div className="relative space-y-1">
            <span className="block text-xs text-[var(--tx-secondary)]">
              名前・ヨミを入力すると<strong className="text-[var(--tx-primary)]">下に予測候補</strong>
              が出ます（カタカナ／ひらがな／漢字の一部）。
            </span>
            <input
              type="text"
              value={kanaInput}
              onChange={(e) => setKanaInput(e.target.value)}
              placeholder="例）ヤマダ・やまだ・山田（空欄＝リピーター一覧）"
              className="relative z-10 w-full rounded-xl border border-[var(--bd-base)] px-3 py-3 text-lg outline-none focus:border-[var(--ac-base)]"
              autoComplete="off"
              autoCapitalize="off"
            />
            {inputTrim && predictTop.length > 0 ? (
              <div
                className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[var(--bd-base)] bg-[var(--bg-card)] shadow-lg"
                role="listbox"
                aria-label="予測候補"
              >
                <p className="border-b border-[var(--bd-base)] bg-[var(--ac-light)]/50 px-3 py-1.5 text-[10px] font-bold text-[var(--ac-text)]">
                  予測（タップで確定）
                </p>
                <ul className="max-h-64 overflow-y-auto">
                  {predictTop.map((c) => (
                    <li key={`pred-${c.id}`} role="option">
                      <button
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="flex w-full flex-col items-stretch border-b border-[var(--bd-base)] px-3 py-3 text-left last:border-b-0 hover:bg-[var(--ac-light)]/40"
                      >
                        <span className="font-bold text-[var(--tx-primary)]">{c.displayName}</span>
                        <span className="text-xs text-[var(--tx-secondary)]">ヨミ: {c.searchKana}</span>
                        {formatLastVisitLine(c) ? (
                          <span className="mt-0.5 text-xs font-medium text-[var(--ac-text)]">
                            {formatLastVisitLine(c)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {inputTrim && searchRanked && searchRanked.length === 0 ? (
              <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-md">
                一致なし — 下の「新規のお客様」か、表記を変えて試してください。
              </p>
            ) : null}
          </div>

          {inputTrim && searchRanked ? (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ac-base)]">
                検索結果（{searchRanked.length}件・予測順）
              </h3>
              <ul className="max-h-[min(28rem,70vh)] space-y-2 overflow-y-auto">
                {searchRanked.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="w-full rounded-xl border border-[var(--bd-base)] bg-white px-4 py-4 text-left transition hover:border-[var(--ac-base)] active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-lg font-bold text-[var(--tx-primary)]">
                          {c.displayName}
                        </span>
                        {c.lastReservation ? (
                          <span className="shrink-0 rounded-full bg-[var(--ac-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--ac-text)]">
                            リピート
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                            初回・不明
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--tx-secondary)]">ヨミ: {c.searchKana}</p>
                      {formatLastVisitLine(c) ? (
                        <p className="mt-1 text-sm font-medium text-[var(--tx-primary)]">
                          {formatLastVisitLine(c)}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ac-base)]">
                直近のリピーター（タップで次へ）
              </h3>
              <ul className="max-h-[min(16rem,40vh)] space-y-2 overflow-y-auto">
                {repeatersFirst.length === 0 ? (
                  <li className="text-sm text-[var(--tx-secondary)]">まだ「前回あり」の登録がありません。</li>
                ) : (
                  repeatersFirst.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="w-full rounded-xl border-2 border-[var(--ac-base)]/30 bg-[var(--ac-light)]/40 px-4 py-4 text-left transition hover:border-[var(--ac-base)] active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-lg font-bold text-[var(--tx-primary)]">
                            {c.displayName}
                          </span>
                          <span className="shrink-0 rounded-full bg-[var(--ac-base)] px-2 py-0.5 text-[10px] font-bold text-white">
                            リピート
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--tx-secondary)]">ヨミ: {c.searchKana}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--ac-text)]">
                          {formatLastVisitLine(c)}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <h3 className="pt-2 text-xs font-bold text-[var(--tx-secondary)]">
                初回・履歴なし（検索でも可）
              </h3>
              <ul className="max-h-[min(14rem,35vh)] space-y-2 overflow-y-auto">
                {othersFirst.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="w-full rounded-xl border border-[var(--bd-base)] bg-white px-4 py-3 text-left transition hover:border-[var(--ac-base)]"
                    >
                      <span className="text-base font-bold text-[var(--tx-primary)]">{c.displayName}</span>
                      <p className="text-xs text-[var(--tx-secondary)]">ヨミ: {c.searchKana}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            type="button"
            onClick={startNewCustomer}
            className="w-full rounded-xl border-2 border-dashed border-[var(--ac-base)] py-4 text-base font-bold text-[var(--ac-base)]"
          >
            ＋ 新規のお客様（名前入力へ）
          </button>
        </section>
      ) : null}

      {step === 'repeat_choice' && customer ? (
        <section className="space-y-4 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
          <h2 className="text-sm font-bold">リピーター: 前回と同じ？</h2>
          <p className="text-base text-[var(--tx-secondary)]">
            <span className="font-bold text-[var(--tx-primary)]">{customer.displayName}</span>
            様 — いちばん早いのは
            <strong className="text-[var(--ac-text)]">「前回と同じ」</strong>
            です。
          </p>
          {customer.lastReservation ? (
            <div className="rounded-xl bg-[var(--ac-light)]/60 px-4 py-3 text-sm leading-relaxed">
              <p className="font-semibold text-[var(--tx-primary)]">
                {lastMenuName ?? '—'} / {lastStaffName ?? '—'}
                {lastDurationMin != null ? `（約${lastDurationMin}分）` : ''}
              </p>
              <p className="text-xs text-[var(--tx-secondary)]">
                前回来店: {customer.lastReservation.date.replace(/-/g, '/')}
              </p>
            </div>
          ) : null}
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleRepeatChoice(true)}
              className="rounded-2xl bg-[var(--ac-base)] py-5 text-base font-bold leading-tight text-white shadow-sm active:opacity-90"
            >
              前回と同じ（メニュー・担当はそのまま）
              <span className="mt-1 block text-xs font-normal opacity-90">
                次の画面で日付と時間だけ選べば完了です
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleRepeatChoice(false)}
              className="rounded-2xl border-2 border-[var(--bd-base)] bg-white py-4 text-base font-bold text-[var(--tx-primary)]"
            >
              メニュー・担当を変える
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
                setStep('customer');
              }}
              className="py-2 text-sm text-[var(--tx-secondary)] underline"
            >
              お客様選択に戻る
            </button>
          </div>
        </section>
      ) : null}

      {step === 'menu' ? (
        <section className="space-y-4 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">メニュー・担当</h2>
            <button type="button" onClick={backFromMenu} className="text-xs text-[var(--ac-base)]">
              戻る
            </button>
          </div>
          {isNewCustomer ? (
            <label className="block space-y-1">
              <span className="text-xs text-[var(--tx-secondary)]">お客様のお名前（必須）</span>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="例）山田 花子"
                className="w-full rounded-xl border border-[var(--bd-base)] px-3 py-3 text-lg outline-none focus:border-[var(--ac-base)]"
              />
            </label>
          ) : (
            <p className="text-sm">
              お客様:{' '}
              <span className="font-bold">{customer?.displayName}</span>
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-[var(--tx-secondary)]">メニュー</span>
            <select
              value={menuId ?? ''}
              onChange={(e) => setMenuId(e.target.value || null)}
              className="w-full rounded-xl border border-[var(--bd-base)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--ac-base)]"
            >
              <option value="">選択してください</option>
              {storeMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{m.durationMinutes}分・¥{m.price.toLocaleString()}）
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--tx-secondary)]">担当</span>
            <select
              value={staffId ?? ''}
              onChange={(e) => setStaffId(e.target.value || null)}
              className="w-full rounded-xl border border-[var(--bd-base)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--ac-base)]"
            >
              {storeStaffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={goMenuNext}
            className="w-full rounded-xl bg-[var(--ac-base)] py-3 text-sm font-bold text-white"
          >
            日時を選ぶ
          </button>
        </section>
      ) : null}

      {step === 'datetime' ? (
        <section className="space-y-4 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
          {useLastContent === true && lastMenuName && lastStaffName ? (
            <div className="rounded-xl border border-[var(--ac-base)]/40 bg-[var(--ac-light)]/50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ac-text)]">
                予約内容（前回と同じ）
              </p>
              <p className="text-sm font-semibold text-[var(--tx-primary)]">
                {lastMenuName} · {lastStaffName}
                {lastDurationMin != null ? ` · 約${lastDurationMin}分` : ''}
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">日時</h2>
            <button
              type="button"
              onClick={backFromDatetime}
              className="text-xs text-[var(--ac-base)]"
            >
              戻る
            </button>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--tx-secondary)]">日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--bd-base)] px-3 py-3 text-base outline-none focus:border-[var(--ac-base)]"
            />
          </label>
          <div>
            <p className="mb-2 text-xs text-[var(--tx-secondary)]">開始時刻（30分刻み）</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {timeSlots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`min-h-[48px] rounded-lg border px-2 py-3 text-base font-semibold ${
                    time === t
                      ? 'border-[var(--ac-base)] bg-[var(--ac-light)] text-[var(--ac-text)]'
                      : 'border-[var(--bd-base)] bg-white text-[var(--tx-primary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={goDatetimeNext}
            className="w-full rounded-xl bg-[var(--ac-base)] py-3 text-sm font-bold text-white"
          >
            内容を確認
          </button>
        </section>
      ) : null}

      {step === 'confirm' && selectedMenu && selectedStaff && time ? (
        <section className="space-y-4 rounded-2xl border border-[var(--bd-base)] bg-[var(--bg-card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">確認</h2>
            <button
              type="button"
              onClick={backFromConfirm}
              className="text-xs text-[var(--ac-base)]"
            >
              戻る
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            {useLastContent === true ? (
              <div className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-900">
                リピート予約（前回と同じコース）
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-b border-[var(--bd-base)] py-2">
              <dt className="text-[var(--tx-secondary)]">お客様</dt>
              <dd className="font-medium text-right">
                {isNewCustomer ? newDisplayName : customer?.displayName}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--bd-base)] py-2">
              <dt className="text-[var(--tx-secondary)]">メニュー</dt>
              <dd className="font-medium text-right">{selectedMenu.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--bd-base)] py-2">
              <dt className="text-[var(--tx-secondary)]">担当</dt>
              <dd className="font-medium text-right">{selectedStaff.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--bd-base)] py-2">
              <dt className="text-[var(--tx-secondary)]">日時</dt>
              <dd className="font-medium text-right">
                {date.replace(/-/g, '/')} {time}〜
              </dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={submitting}
            onClick={submitReservation}
            className="w-full rounded-xl bg-[var(--ac-base)] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? '登録中…' : '予約を登録する'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
