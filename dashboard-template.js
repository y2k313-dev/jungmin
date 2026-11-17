// 조회 결과를 한 장짜리 HTML 대시보드로 만듭니다 (외부 파일 없이 열림).
// 디자인: 흰 바탕 + 초록 포인트의 심플한 스타일
//  - 1024px 미만(폰·태블릿): 카드 목록 / 1024px 이상(데스크톱): 표
import { THEME_TOKENS } from './theme.js';

// opts.update = { url, key, repo }: 상단 "업데이트" 버튼 설정 (없으면 버튼을 숨김)
export function renderDashboard(data, now, opts = {}) {
  const json = JSON.stringify({ accounts: data, generatedAt: now.toISOString(), update: opts.update || null }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#1e9150">
<title>도서관 대출 현황</title>
<style>
${THEME_TOKENS}
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font-family: "Pretendard", "Noto Sans KR", Roboto, "Malgun Gothic", system-ui, sans-serif;
    font-size: 15px; line-height: 1.5; -webkit-tap-highlight-color: transparent; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px calc(40px + env(safe-area-inset-bottom)); }

  /* ---------- 상단 초록 헤더 ---------- */
  .appbar { position: sticky; top: 0; z-index: 5; background: var(--green); color: #fff;
    padding: calc(14px + env(safe-area-inset-top)) 16px 14px; }
  .appbar.scrolled { box-shadow: 0 2px 8px rgba(0, 0, 0, .12); }
  .appbar-in { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
  .logo { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center;
    background: rgba(255, 255, 255, .18); color: #fff; }
  .upd { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; min-width: 44px; padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, .35); border-radius: 999px; background: rgba(255, 255, 255, .14); color: #fff;
    font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .upd[hidden] { display: none; }
  .upd:hover { background: rgba(255, 255, 255, .24); }
  .upd:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .upd:disabled { cursor: default; opacity: .9; }
  .upd.busy .upd-ic { animation: spin 1s linear infinite; }
  .upd.err { background: #fff; color: var(--red-text); border-color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .upd.busy .upd-ic { animation: none; } }
  .appbar h1 { font-size: 19px; line-height: 26px; font-weight: 700; margin: 0; letter-spacing: -.2px; }
  .appbar .sub { font-size: 12.5px; line-height: 18px; color: rgba(255, 255, 255, .82); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ---------- 알림 ---------- */
  .alerts { margin-top: 16px; }
  .alert { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px;
    margin-bottom: 8px; font-size: 14px; line-height: 20px; overflow-wrap: anywhere; }
  .alert.info { background: var(--green-soft); color: var(--green-text); }
  .alert.err { background: var(--red-soft); color: var(--red-text); }
  .alert.warn { background: var(--amber-soft); color: var(--amber-text); }
  .alert ul { margin: 4px 0 0; padding-left: 18px; }

  /* ---------- 요약 ---------- */
  .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
  @media (min-width: 600px) { .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px;
    min-width: 0; box-shadow: var(--shadow); display: flex; align-items: center; gap: 12px; }
  .stat .ic { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center;
    background: var(--gray-soft); color: var(--sub); }
  .stat.total .ic { background: var(--green-soft); color: var(--green); }
  .stat.danger.on .ic { background: var(--red-soft); color: var(--red-text); }
  .stat.warn.on .ic { background: var(--amber-soft); color: var(--amber-text); }
  .stat span { display: block; font-size: 12.5px; line-height: 18px; color: var(--muted); }
  .stat b { display: block; font-size: 24px; line-height: 30px; font-weight: 800; letter-spacing: -.5px; color: var(--text); }
  .stat.total b { color: var(--green); }
  .stat.danger.on b { color: var(--red-text); }
  .stat.warn.on b { color: var(--amber-text); }

  /* ---------- 목록 패널 ---------- */
  .panel { background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 16px; }
  @media (max-width: 599px) {
    .panel { padding: 14px 10px; border-radius: 14px; }
    .card { padding: 12px; gap: 10px; }
    .card-side { width: 54px; }
  }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .panel-head h2 { font-size: 16px; line-height: 24px; font-weight: 700; margin: 0; }
  .count { font-size: 13px; color: var(--muted); }

  .controls { display: grid; gap: 10px; margin-bottom: 16px; }
  @media (min-width: 768px) { .controls { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: end; } }
  .seg { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--gray-soft); }
  .seg button { flex: 1 1 0; min-width: 0; min-height: 44px; border: 0; border-radius: 9px; background: transparent;
    color: var(--sub); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; padding: 0 6px; }
  .seg button.on { background: var(--card); color: var(--green-text); box-shadow: 0 1px 3px rgba(16, 24, 40, .1); }
  .filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
  .field { position: relative; min-width: 0; }
  .field label { display: block; font-size: 12px; line-height: 16px; color: var(--muted); margin: 0 0 4px 2px; }
  .field select { width: 100%; height: 48px; appearance: none; -webkit-appearance: none; font: inherit; font-size: 15px;
    color: var(--text); background: var(--card); border: 1px solid var(--line-strong); border-radius: 10px;
    padding: 0 36px 0 14px; cursor: pointer; text-overflow: ellipsis; }
  .field::after { content: ""; position: absolute; right: 14px; bottom: 21px; width: 7px; height: 7px;
    border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(45deg); pointer-events: none; }
  .seg button:focus-visible, .field select:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }

  .group { margin-bottom: 20px; }
  .group:last-child { margin-bottom: 0; }
  .group h2 { font-size: 15px; line-height: 22px; font-weight: 700; margin: 4px 2px 10px; display: flex; align-items: center; gap: 8px; }
  .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 7px;
    border-radius: 999px; background: var(--green-soft); color: var(--green-text); font-size: 12px; font-weight: 700; }

  /* ---------- 카드 (폰·태블릿) ---------- */
  .cards { display: grid; gap: 8px; }
  @media (min-width: 600px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
  .card { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 12px; min-width: 0;
    background: var(--card); border: 1px solid var(--line); position: relative; overflow: hidden; }
  .card.over::before, .card.soon::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
  .card.over::before { background: var(--red-text); }
  .card.soon::before { background: var(--amber-text); }
  .card-side { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: 6px; width: 60px; }
  .card-body { min-width: 0; flex: 1; }
  .card h3 { margin: 1px 0 4px; font-size: 15px; line-height: 21px; font-weight: 700; overflow-wrap: anywhere; word-break: keep-all; }
  .meta { margin: 0; font-size: 13px; line-height: 19px; color: var(--muted); overflow-wrap: anywhere; }
  .meta b { color: var(--sub); font-weight: 600; }

  .dd { display: inline-flex; align-items: center; justify-content: center; height: 26px; padding: 0 8px; border-radius: 7px;
    font-size: 12.5px; font-weight: 700; white-space: nowrap; background: var(--gray-soft); color: var(--sub); }
  .over .dd { background: var(--red-soft); color: var(--red-text); }
  .soon .dd { background: var(--amber-soft); color: var(--amber-text); }
  .ext { display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 7px; border-radius: 999px;
    font-size: 11.5px; font-weight: 700; white-space: nowrap; border: 1px solid var(--line-strong); color: var(--muted); background: var(--card); }
  .ext.e1 { border-color: transparent; background: var(--green-soft); color: var(--green-text); }
  .ext.e2 { border-color: transparent; background: var(--dark); color: #fff; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { display: inline-flex; align-items: center; min-height: 24px; padding: 2px 9px; border-radius: 999px;
    background: var(--gray-soft); color: var(--sub); font-size: 12px; line-height: 18px; font-weight: 500; max-width: 100%; overflow-wrap: anywhere; }
  .chip.can { background: var(--green); color: #fff; font-weight: 700; }

  /* ---------- 표 (데스크톱) ---------- */
  .table-wrap { display: none; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px 14px; text-align: left; font-size: 14px; line-height: 20px; vertical-align: middle; }
  th { background: #fafbfc; color: var(--muted); font-weight: 600; font-size: 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  td { border-bottom: 1px solid var(--line); }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover td { background: #fafbfc; }
  td.nw { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--sub); }
  td.title { font-weight: 700; min-width: 220px; }
  td.status { color: var(--muted); max-width: 260px; font-size: 13px; }
  td .chip { white-space: nowrap; }
  @media (min-width: 1024px) {
    .cards { display: none; }
    .table-wrap { display: block; }
  }

  .empty { color: var(--muted); padding: 32px 16px; text-align: center; border: 1px dashed var(--line-strong); border-radius: 12px; }
</style>
</head>
<body>
<header class="appbar" id="appbar">
  <div class="appbar-in">
    <div class="logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
    </div>
    <div style="min-width:0; flex:1">
      <h1>도서관 대출 현황</h1>
      <div class="sub" id="gen"></div>
    </div>
    <button class="upd" id="upd" type="button" hidden aria-live="polite">
      <svg class="upd-ic" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      <span id="updText">업데이트</span>
    </button>
  </div>
</header>
<main class="wrap">
  <div class="alerts" id="alerts"></div>
  <section class="summary" id="summary" aria-label="요약"></section>
  <section class="panel">
    <div class="panel-head"><h2>대출 목록</h2><span class="count" id="count"></span></div>
    <div class="controls" aria-label="보기 설정">
      <div class="seg" role="group" aria-label="묶어 보기">
        <button data-g="due" class="on" aria-pressed="true">반납일순</button>
        <button data-g="borrower" aria-pressed="false">사람별</button>
        <button data-g="library" aria-pressed="false">도서관별</button>
      </div>
      <div class="filters">
        <div class="field"><label for="fAcc">대출자</label><select id="fAcc"><option value="">전체</option></select></div>
        <div class="field"><label for="fLib">도서관</label><select id="fLib"><option value="">전체</option></select></div>
      </div>
    </div>
    <div id="list"></div>
  </section>
</main>
<script>
const DATA = ${json};
const today = new Date(); today.setHours(0,0,0,0);
const dday = (d) => d ? Math.round((new Date(d + 'T00:00:00') - today) / 86400000) : null;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WD = ['일','월','화','수','목','금','토'];
const md = (d) => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return (x.getMonth()+1) + '월 ' + x.getDate() + '일 (' + WD[x.getDay()] + ')'; };

const seen = new Set();
const rows = DATA.accounts.flatMap((a) => (a.loans || []).map((l) => ({ ...l, account: a.name, borrower: l.borrower || a.name, library: l.library || '(도서관 정보 없음)', d: dday(l.dueDate) })))
  .filter((r) => { const k = r.title + '|' + r.borrower + '|' + r.loanDate; if (seen.has(k)) return false; seen.add(k); return true; });
rows.sort((x, y) => (x.d ?? 9999) - (y.d ?? 9999) || x.borrower.localeCompare(y.borrower) || x.title.localeCompare(y.title));

document.getElementById('gen').textContent = new Date(DATA.generatedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' 갱신';
const extDone = DATA.accounts.flatMap((a) => a.extended || []);
// 자동 갱신이 멈췄는지 바로 알 수 있도록: 마지막 갱신이 20시간보다 오래됐으면 경고
const ageH = (Date.now() - new Date(DATA.generatedAt)) / 3600000;
const stale = ageH > 20 ? '<div class="alert warn" role="alert"><span aria-hidden="true">⚠</span><span>마지막 갱신이 ' + (ageH >= 48 ? Math.floor(ageH / 24) + '일' : Math.floor(ageH) + '시간') + ' 전이에요. 오늘 자동 갱신·연장이 안 됐을 수 있어요. 오른쪽 위 업데이트 버튼을 눌러 주세요.</span></div>' : '';
// 자동 연장 목록은 보여주지 않고, 실패한 경우만 한 줄로 알림
const extFail = extDone.filter((e) => !e.ok).length;
document.getElementById('alerts').innerHTML = stale + (extFail ? '<div class="alert err" role="alert"><span aria-hidden="true">⚠</span><span>자동 연장에 실패한 책이 ' + extFail + '권 있어요. 도서관 사이트에서 확인해 주세요.</span></div>' : '') +
  DATA.accounts.map((a) =>
  (a.error ? '<div class="alert err" role="alert"><span aria-hidden="true">⚠</span><span>' + esc(a.name) + ': ' + esc(a.error) + '</span></div>' : '') +
  (a.warning ? '<div class="alert warn"><span aria-hidden="true">ℹ</span><span>' + esc(a.name) + ': ' + esc(a.warning) + '</span></div>' : '')).join('');

const over = rows.filter((r) => r.d !== null && r.d < 0).length;
const soon = rows.filter((r) => r.d !== null && r.d >= 0 && r.d <= 3).length;
const IC = {
  book: '<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>',
  alert: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
  clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.5 11H11V7h1.5v4.7l3.6 2.1-.8 1.3-3.8-2.1z"/>',
  people: '<path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"/>',
};
const stat = (c, ic, label, n) => '<div class="stat ' + c + '"><div class="ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' + IC[ic] + '</svg></div><div><span>' + label + '</span><b>' + n + '</b></div></div>';
document.getElementById('summary').innerHTML =
  stat('total', 'book', '대출 중', rows.length) +
  stat('danger' + (over ? ' on' : ''), 'alert', '연체', over) +
  stat('warn' + (soon ? ' on' : ''), 'clock', '3일 안에 반납', soon) +
  stat('', 'people', '대출자', new Set(rows.map((r) => r.borrower)).size);

const fill = (id, vals) => { const s = document.getElementById(id); [...new Set(vals)].sort().forEach((v) => s.insertAdjacentHTML('beforeend', '<option>' + esc(v) + '</option>')); };
fill('fAcc', rows.map((r) => r.borrower));
fill('fLib', rows.map((r) => r.library));

let groupBy = 'due';
// 대출 기간으로 연장 횟수 추정: 2주=연장0, 3주=연장1, 4주=연장2 (1회 연장 = 7일)
function extCount(r) {
  if (!r.loanDate || !r.dueDate) return null;
  const days = Math.round((new Date(r.dueDate + 'T00:00:00') - new Date(r.loanDate + 'T00:00:00')) / 86400000);
  if (days % 7) return null;
  const n = days / 7 - 2;
  return n >= 0 && n <= 2 ? n : null;
}
const extBadge = (r) => { const n = extCount(r); return n === null ? '' : '<span class="ext e' + n + '" title="' + (n >= 2 ? '더 연장할 수 없어요' : '앞으로 ' + (2 - n) + '번 더 연장 가능') + '">연장' + n + '</span>'; };
const cls = (r) => r.d !== null && r.d < 0 ? 'over' : r.d !== null && r.d <= 3 ? 'soon' : '';
function ddayText(d) { if (d === null) return '-'; if (d < 0) return (-d) + '일 연체'; if (d === 0) return '오늘'; return 'D-' + d; }

function cards(list, hide) {
  return '<div class="cards">' + list.map((r) => {
    const meta = [hide !== 'borrower' && r.borrower, hide !== 'library' && r.library].filter(Boolean).map(esc).join(' · ');
    return '<article class="card ' + cls(r) + '">' +
      '<div class="card-side">' + extBadge(r) + '<span class="dd">' + ddayText(r.d) + '</span></div>' +
      '<div class="card-body"><h3>' + esc(r.title) + '</h3>' +
      (meta ? '<p class="meta">' + meta + '</p>' : '') +
      '<p class="meta"><b>반납 ' + md(r.dueDate) + '</b>' + (r.loanDate ? ' · 대출 ' + md(r.loanDate) : '') + '</p>' +
      ((r.canExtend || (r.status && r.status !== '대출중')) ? '<div class="chips">' + (r.canExtend ? '<span class="chip can">연장 가능</span>' : '') + (r.status && r.status !== '대출중' ? '<span class="chip">' + esc(r.status) + '</span>' : '') + '</div>' : '') +
      '</div></article>';
  }).join('') + '</div>';
}
function table(list, hide) {
  const cols = [['반납','dday'],['연장','ext'],['책 제목','title'],['대출자','borrower'],['도서관','library'],['반납예정일','dueDate'],['대출일','loanDate'],['상태','status']]
    .filter(([, k]) => k !== hide);
  return '<div class="table-wrap"><table><thead><tr>' + cols.map(([h]) => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' +
    list.map((r) => '<tr class="' + cls(r) + '">' + cols.map(([, k]) =>
      k === 'dday' ? '<td class="nw"><span class="dd">' + ddayText(r.d) + '</span></td>'
      : k === 'ext' ? '<td class="nw">' + extBadge(r) + '</td>'
      : k === 'library' || k === 'borrower' ? '<td class="nw"><span class="chip">' + esc(r[k]) + '</span></td>'
      : k === 'title' ? '<td class="title">' + esc(r.title) + '</td>'
      : k === 'status' ? '<td class="status">' + (r.canExtend ? '<span class="chip can">연장 가능</span> ' : '') + esc(r.status) + '</td>'
      : '<td class="nw">' + esc(r[k] || '') + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}
const view = (list, hide) => list.length ? cards(list, hide) + table(list, hide) : '<div class="empty">대출 중인 책이 없어요</div>';

function render() {
  const fa = document.getElementById('fAcc').value, fl = document.getElementById('fLib').value;
  const list = rows.filter((r) => (!fa || r.borrower === fa) && (!fl || r.library === fl));
  const el = document.getElementById('list');
  document.getElementById('count').textContent = list.length + '권';
  if (groupBy === 'due') { el.innerHTML = view(list); return; }
  const groups = {};
  list.forEach((r) => (groups[r[groupBy]] ||= []).push(r));
  const keys = Object.keys(groups).sort();
  el.innerHTML = keys.length ? keys.map((k) => '<section class="group"><h2>' + esc(k) + ' <span class="badge">' + groups[k].length + '</span></h2>' + view(groups[k], groupBy) + '</section>').join('')
    : view([]);
}
document.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
  groupBy = b.dataset.g;
  document.querySelectorAll('[data-g]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
  render();
});
document.getElementById('fAcc').onchange = render;
document.getElementById('fLib').onchange = render;
const bar = document.getElementById('appbar');
addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 8), { passive: true });
render();

// ---------- 상단 "업데이트" 버튼: 구글 Apps Script → GitHub 실행(정보 갱신 + 연장) → 끝나면 새로고침 ----------
(function () {
  const U = DATA.update;
  const btn = document.getElementById('upd'), txt = document.getElementById('updText');
  if (!U || !U.url || !U.key) return;
  btn.hidden = false;
  const set = (t, cls) => { txt.textContent = t; btn.className = 'upd' + (cls ? ' ' + cls : ''); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function latestRun(since) {
    const r = await fetch('https://api.github.com/repos/' + U.repo + '/actions/runs?per_page=5&event=workflow_dispatch', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.workflow_runs || []).find((x) => new Date(x.created_at).getTime() >= since - 90000) || null;
  }
  btn.onclick = async () => {
    btn.disabled = true;
    set('요청 중', 'busy');
    try {
      const res = await fetch(U.url, { method: 'POST', body: JSON.stringify({ key: U.key }) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.msg || '요청 실패');
      const since = j.since || Date.now();
      const t0 = Date.now();
      // GitHub 실행이 끝날 때까지 기다리기 (보통 1~2분)
      for (;;) {
        const sec = Math.round((Date.now() - t0) / 1000);
        set('갱신 중 ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), 'busy');
        if (sec > 600) throw new Error('시간 초과');
        await sleep(8000);
        let run = null;
        try { run = await latestRun(since); } catch (e) { /* 잠깐 실패해도 계속 */ }
        if (run && run.status === 'completed') {
          if (run.conclusion !== 'success') throw new Error('GitHub 실행 실패');
          set('완료!', 'busy');
          await sleep(4000);
          location.replace(location.pathname + '?t=' + Date.now());
          return;
        }
      }
    } catch (e) {
      set('다시 시도', 'err');
      btn.title = String(e.message || e);
      btn.disabled = false;
    }
  };
})();
</script>
</body>
</html>`;
}
