// 조회 결과를 한 장짜리 HTML 대시보드로 만듭니다 (외부 파일 없이 열림).
// 디자인: 안드로이드 Material 3 (Material You) 스타일
//  - 1024px 미만(폰·태블릿): 카드 목록 / 1024px 이상(데스크톱): 표
import { M3_TOKENS } from './theme.js';

export function renderDashboard(data, now) {
  const json = JSON.stringify({ accounts: data, generatedAt: now.toISOString() }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#f6fbf5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1511" media="(prefers-color-scheme: dark)">
<title>도서관 대출 현황</title>
<style>
${M3_TOKENS}
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--surface); color: var(--on-surface);
    font-family: Roboto, "Noto Sans KR", "Pretendard", "Malgun Gothic", system-ui, sans-serif;
    font-size: 16px; line-height: 1.5; -webkit-tap-highlight-color: transparent; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px calc(32px + env(safe-area-inset-bottom)); }

  /* ---------- Top app bar ---------- */
  .appbar { position: sticky; top: 0; z-index: 5; background: var(--surface);
    padding: calc(12px + env(safe-area-inset-top)) 16px 12px; transition: background .2s; }
  .appbar.scrolled { background: var(--surface-container); }
  .appbar-in { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 12px; min-height: 48px; }
  .appbar-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
    background: var(--primary-container); color: var(--on-primary-container); flex: none; }
  .appbar h1 { font-size: 22px; line-height: 28px; font-weight: 500; margin: 0; }
  .appbar .sub { font-size: 13px; line-height: 18px; color: var(--on-surface-variant); }

  /* ---------- Alerts ---------- */
  .alert { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 16px;
    margin: 8px 0; font-size: 14px; line-height: 20px; overflow-wrap: anywhere; }
  .alert.err { background: var(--error-container); color: var(--on-error-container); }
  .alert.warn { background: var(--warn-container); color: var(--on-warn-container); }

  /* ---------- Summary cards ---------- */
  .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 8px 0 20px; }
  @media (min-width: 600px) { .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .stat { background: var(--surface-container-low); border-radius: 16px; padding: 16px; min-width: 0; }
  .stat b { display: block; font-size: 32px; line-height: 40px; font-weight: 400; }
  .stat span { display: block; font-size: 14px; line-height: 20px; color: var(--on-surface-variant); font-weight: 500; }
  .stat.danger.on { background: var(--error-container); }
  .stat.danger.on b, .stat.danger.on span { color: var(--on-error-container); }
  .stat.warn.on { background: var(--warn-container); }
  .stat.warn.on b, .stat.warn.on span { color: var(--on-warn-container); }

  /* ---------- Segmented button ---------- */
  .controls { display: grid; gap: 12px; margin-bottom: 16px; }
  @media (min-width: 768px) { .controls { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: end; } }
  .seg { display: flex; border: 1px solid var(--outline); border-radius: 999px; overflow: hidden; }
  .seg button { flex: 1 1 0; min-width: 0; min-height: 48px; border: 0; border-left: 1px solid var(--outline); background: transparent;
    color: var(--on-surface); font: inherit; font-size: 14px; font-weight: 500; letter-spacing: .1px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px; white-space: nowrap; }
  .seg button:first-child { border-left: 0; }
  .seg button .check { display: none; }
  .seg button.on { background: var(--secondary-container); color: var(--on-secondary-container); }
  .seg button.on .check { display: inline; }
  .seg button:focus-visible, .field select:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }

  /* ---------- Outlined dropdown fields ---------- */
  .filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
  .field { position: relative; min-width: 0; }
  .field label { position: absolute; top: -9px; left: 12px; padding: 0 4px; font-size: 12px; line-height: 16px;
    color: var(--on-surface-variant); background: var(--surface); pointer-events: none; }
  .field select { width: 100%; height: 56px; appearance: none; -webkit-appearance: none; font: inherit; font-size: 16px;
    color: var(--on-surface); background: transparent; border: 1px solid var(--outline); border-radius: 4px;
    padding: 0 40px 0 16px; cursor: pointer; text-overflow: ellipsis; }
  .field::after { content: ""; position: absolute; right: 16px; top: 50%; margin-top: -3px; border: 5px solid transparent;
    border-top: 6px solid var(--on-surface-variant); pointer-events: none; }
  .field select option { background: var(--surface-container-high); color: var(--on-surface); }

  /* ---------- Section header ---------- */
  .group { margin-bottom: 24px; }
  .group h2 { font-size: 16px; line-height: 24px; font-weight: 500; margin: 8px 4px 8px; color: var(--primary);
    display: flex; align-items: center; gap: 8px; }
  .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 8px;
    border-radius: 999px; background: var(--secondary-container); color: var(--on-secondary-container); font-size: 12px; font-weight: 500; }

  /* ---------- Cards (phone / tablet) ---------- */
  .cards { display: grid; gap: 8px; }
  @media (min-width: 600px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
  .card { display: flex; gap: 14px; align-items: flex-start; padding: 16px; border-radius: 16px; min-width: 0;
    background: var(--surface-container-low); }
  .card.over { background: var(--error-container); color: var(--on-error-container); }
  .card.soon { background: var(--warn-container); color: var(--on-warn-container); }
  .dd { flex: none; min-width: 56px; height: 32px; padding: 0 10px; border-radius: 8px; display: inline-flex;
    align-items: center; justify-content: center; font-size: 14px; font-weight: 700; white-space: nowrap;
    background: var(--secondary-container); color: var(--on-secondary-container); }
  .over .dd { background: var(--error); color: var(--on-error); }
  .soon .dd { background: var(--on-warn-container); color: var(--warn-container); }
  .card-body { min-width: 0; flex: 1; }
  .card h3 { margin: 4px 0 4px; font-size: 16px; line-height: 22px; font-weight: 500; overflow-wrap: anywhere; word-break: keep-all; }
  .meta { margin: 0; font-size: 14px; line-height: 20px; color: var(--on-surface-variant); overflow-wrap: anywhere; }
  .card.over .meta, .card.soon .meta { color: inherit; opacity: .85; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { display: inline-flex; align-items: center; min-height: 28px; padding: 2px 10px; border-radius: 8px;
    border: 1px solid var(--outline-variant); font-size: 13px; line-height: 18px; max-width: 100%; overflow-wrap: anywhere; }
  .card.over .chip, .card.soon .chip { border-color: currentColor; }

  /* ---------- Table (desktop) ---------- */
  .table-wrap { display: none; background: var(--surface-container-low); border-radius: 16px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px 16px; text-align: left; font-size: 14px; line-height: 20px; vertical-align: middle; }
  th { color: var(--on-surface-variant); font-weight: 500; font-size: 13px; border-bottom: 1px solid var(--outline-variant); white-space: nowrap; }
  td { border-bottom: 1px solid var(--outline-variant); }
  tbody tr:last-child td { border-bottom: 0; }
  tr.over td { background: var(--error-container); color: var(--on-error-container); }
  tr.soon td { background: var(--warn-container); color: var(--on-warn-container); }
  td.nw { white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.title { font-weight: 500; min-width: 220px; }
  td.status { color: var(--on-surface-variant); max-width: 260px; }
  tr.over td.status, tr.soon td.status { color: inherit; }
  td .chip { white-space: nowrap; }
  @media (min-width: 1024px) {
    .cards { display: none; }
    .table-wrap { display: block; }
  }

  .empty { color: var(--on-surface-variant); padding: 32px 16px; text-align: center; background: var(--surface-container-low); border-radius: 16px; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<header class="appbar" id="appbar">
  <div class="appbar-in">
    <div class="appbar-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
    </div>
    <div style="min-width:0">
      <h1>도서관 대출 현황</h1>
      <div class="sub" id="gen"></div>
    </div>
  </div>
</header>
<main class="wrap">
  <div id="alerts"></div>
  <section class="summary" id="summary" aria-label="요약"></section>
  <section class="controls" aria-label="보기 설정">
    <div class="seg" role="group" aria-label="묶어 보기">
      <button data-g="due" class="on" aria-pressed="true"><span class="check">✓</span>반납일순</button>
      <button data-g="borrower" aria-pressed="false"><span class="check">✓</span>사람별</button>
      <button data-g="library" aria-pressed="false"><span class="check">✓</span>도서관별</button>
    </div>
    <div class="filters">
      <div class="field"><label for="fAcc">대출자</label><select id="fAcc"><option value="">전체</option></select></div>
      <div class="field"><label for="fLib">도서관</label><select id="fLib"><option value="">전체</option></select></div>
    </div>
  </section>
  <div id="list"></div>
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
document.getElementById('alerts').innerHTML = DATA.accounts.map((a) =>
  (a.error ? '<div class="alert err" role="alert"><span aria-hidden="true">⚠</span><span>' + esc(a.name) + ': ' + esc(a.error) + '</span></div>' : '') +
  (a.warning ? '<div class="alert warn"><span aria-hidden="true">ℹ</span><span>' + esc(a.name) + ': ' + esc(a.warning) + '</span></div>' : '')).join('');

const over = rows.filter((r) => r.d !== null && r.d < 0).length;
const soon = rows.filter((r) => r.d !== null && r.d >= 0 && r.d <= 3).length;
document.getElementById('summary').innerHTML =
  '<div class="stat"><b>' + rows.length + '</b><span>대출 중</span></div>' +
  '<div class="stat danger' + (over ? ' on' : '') + '"><b>' + over + '</b><span>연체</span></div>' +
  '<div class="stat warn' + (soon ? ' on' : '') + '"><b>' + soon + '</b><span>3일 안에 반납</span></div>' +
  '<div class="stat"><b>' + new Set(rows.map((r) => r.borrower)).size + '</b><span>대출자</span></div>';

const fill = (id, vals) => { const s = document.getElementById(id); [...new Set(vals)].sort().forEach((v) => s.insertAdjacentHTML('beforeend', '<option>' + esc(v) + '</option>')); };
fill('fAcc', rows.map((r) => r.borrower));
fill('fLib', rows.map((r) => r.library));

let groupBy = 'due';
const cls = (r) => r.d !== null && r.d < 0 ? 'over' : r.d !== null && r.d <= 3 ? 'soon' : '';
function ddayText(d) { if (d === null) return '-'; if (d < 0) return (-d) + '일 연체'; if (d === 0) return '오늘'; return 'D-' + d; }

function cards(list, hide) {
  return '<div class="cards">' + list.map((r) => {
    const meta = [hide !== 'borrower' && r.borrower, hide !== 'library' && r.library].filter(Boolean).map(esc).join(' · ');
    return '<article class="card ' + cls(r) + '">' +
      '<span class="dd">' + ddayText(r.d) + '</span>' +
      '<div class="card-body"><h3>' + esc(r.title) + '</h3>' +
      (meta ? '<p class="meta">' + meta + '</p>' : '') +
      '<p class="meta">반납 ' + md(r.dueDate) + (r.loanDate ? ' · 대출 ' + md(r.loanDate) : '') + '</p>' +
      (r.status && r.status !== '대출중' ? '<div class="chips"><span class="chip">' + esc(r.status) + '</span></div>' : '') +
      '</div></article>';
  }).join('') + '</div>';
}
function table(list, hide) {
  const cols = [['반납','dday'],['책 제목','title'],['대출자','borrower'],['도서관','library'],['반납예정일','dueDate'],['대출일','loanDate'],['상태','status']]
    .filter(([, k]) => k !== hide);
  return '<div class="table-wrap"><table><thead><tr>' + cols.map(([h]) => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' +
    list.map((r) => '<tr class="' + cls(r) + '">' + cols.map(([, k]) =>
      k === 'dday' ? '<td class="nw"><span class="dd">' + ddayText(r.d) + '</span></td>'
      : k === 'library' || k === 'borrower' ? '<td class="nw"><span class="chip">' + esc(r[k]) + '</span></td>'
      : k === 'title' ? '<td class="title">' + esc(r.title) + '</td>'
      : k === 'status' ? '<td class="status">' + esc(r.status) + '</td>'
      : '<td class="nw">' + esc(r[k] || '') + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}
const view = (list, hide) => list.length ? cards(list, hide) + table(list, hide) : '<div class="empty">대출 중인 책이 없어요</div>';

function render() {
  const fa = document.getElementById('fAcc').value, fl = document.getElementById('fLib').value;
  const list = rows.filter((r) => (!fa || r.borrower === fa) && (!fl || r.library === fl));
  const el = document.getElementById('list');
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
</script>
</body>
</html>`;
}
