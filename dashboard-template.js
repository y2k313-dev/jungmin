// 조회 결과를 한 장짜리 HTML 대시보드로 만듭니다 (외부 파일 없이 열림).
export function renderDashboard(data, now) {
  const json = JSON.stringify({ accounts: data, generatedAt: now.toISOString() }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>도서관 대출 현황</title>
<style>
  :root {
    --bg: #f6f5f1; --card: #ffffff; --text: #1d1d1b; --muted: #6b6a65; --line: #e4e2db;
    --accent: #2f6b4f; --danger: #c0392b; --danger-bg: #fdecea; --warn: #b9770e; --warn-bg: #fdf3e1;
    --ok-bg: #e9f3ee; --chip: #efeee9;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #161614; --card: #1f1f1c; --text: #ecebe6; --muted: #9b9a93; --line: #33332f;
      --accent: #7fc4a0; --danger: #ff8a7a; --danger-bg: #3a1f1c; --warn: #f0b75a; --warn-bg: #3a2e18;
      --ok-bg: #1c2e25; --chip: #2a2a26;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font-family: "Pretendard", "Malgun Gothic", system-ui, sans-serif; line-height: 1.5; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: .9rem; margin-bottom: 20px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .stat b { display: block; font-size: 1.6rem; }
  .stat span { color: var(--muted); font-size: .85rem; }
  .stat.danger b { color: var(--danger); } .stat.warn b { color: var(--warn); }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
  .controls select, .controls button { font: inherit; padding: 8px 12px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
  .controls button.on { background: var(--accent); color: var(--card); border-color: var(--accent); }
  .alert { padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; font-size: .9rem; }
  .alert.err { background: var(--danger-bg); color: var(--danger); }
  .alert.warn { background: var(--warn-bg); color: var(--warn); }
  .group { margin-bottom: 24px; }
  .group h2 { font-size: 1.05rem; margin: 0 0 8px; display: flex; gap: 8px; align-items: baseline; }
  .group h2 small { color: var(--muted); font-weight: normal; }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line);
    border-radius: 12px; overflow: hidden; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--line); font-size: .92rem; }
  th { color: var(--muted); font-weight: 600; font-size: .8rem; background: var(--chip); }
  tr:last-child td { border-bottom: none; }
  tr.over td { background: var(--danger-bg); }
  tr.soon td { background: var(--warn-bg); }
  .dday { font-weight: 700; white-space: nowrap; }
  .over .dday { color: var(--danger); } .soon .dday { color: var(--warn); }
  .chip { display: inline-block; padding: 2px 8px; border-radius: 99px; background: var(--chip); font-size: .8rem; white-space: nowrap; }
  .empty { color: var(--muted); padding: 24px; text-align: center; background: var(--card); border: 1px dashed var(--line); border-radius: 12px; }
  @media (max-width: 640px) {
    thead { display: none; }
    table, tbody, tr, td { display: block; width: 100%; }
    tr { border-bottom: 1px solid var(--line); padding: 8px 0; }
    td { border: none; padding: 2px 12px; }
    td[data-l]::before { content: attr(data-l) " · "; color: var(--muted); font-size: .8rem; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>📚 도서관 대출 현황</h1>
  <div class="sub" id="gen"></div>
  <div id="alerts"></div>
  <div class="summary" id="summary"></div>
  <div class="controls">
    <span>묶어 보기:</span>
    <button data-g="due" class="on">반납일순</button>
    <button data-g="borrower">사람별</button>
    <button data-g="library">도서관별</button>
    <select id="fAcc"><option value="">모든 사람</option></select>
    <select id="fLib"><option value="">모든 도서관</option></select>
  </div>
  <div id="list"></div>
</div>
<script>
const DATA = ${json};
const today = new Date(); today.setHours(0,0,0,0);
const dday = (d) => d ? Math.round((new Date(d + 'T00:00:00') - today) / 86400000) : null;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const seen = new Set();
const rows = DATA.accounts.flatMap((a) => (a.loans || []).map((l) => ({ ...l, account: a.name, borrower: l.borrower || a.name, library: l.library || '(도서관 정보 없음)', d: dday(l.dueDate) })))
  .filter((r) => { const k = r.title + '|' + r.borrower + '|' + r.loanDate; if (seen.has(k)) return false; seen.add(k); return true; });
rows.sort((x, y) => (x.d ?? 9999) - (y.d ?? 9999));

document.getElementById('gen').textContent = '조회 시각: ' + new Date(DATA.generatedAt).toLocaleString('ko-KR');
document.getElementById('alerts').innerHTML = DATA.accounts.map((a) =>
  (a.error ? '<div class="alert err">⚠ ' + esc(a.name) + ': ' + esc(a.error) + '</div>' : '') +
  (a.warning ? '<div class="alert warn">ℹ ' + esc(a.name) + ': ' + esc(a.warning) + '</div>' : '')).join('');

const over = rows.filter((r) => r.d !== null && r.d < 0).length;
const soon = rows.filter((r) => r.d !== null && r.d >= 0 && r.d <= 3).length;
document.getElementById('summary').innerHTML =
  '<div class="stat"><b>' + rows.length + '</b><span>대출 중인 책</span></div>' +
  '<div class="stat danger"><b>' + over + '</b><span>연체</span></div>' +
  '<div class="stat warn"><b>' + soon + '</b><span>3일 안에 반납</span></div>' +
  '<div class="stat"><b>' + new Set(rows.map((r) => r.borrower)).size + '</b><span>대출자</span></div>';

const fill = (id, vals) => { const s = document.getElementById(id); [...new Set(vals)].sort().forEach((v) => s.insertAdjacentHTML('beforeend', '<option>' + esc(v) + '</option>')); };
fill('fAcc', rows.map((r) => r.borrower));
fill('fLib', rows.map((r) => r.library));

let groupBy = 'due';
function ddayText(d) { if (d === null) return '-'; if (d < 0) return (-d) + '일 연체'; if (d === 0) return '오늘 반납'; return 'D-' + d; }
function table(list, hide) {
  if (!list.length) return '<div class="empty">대출 중인 책이 없어요</div>';
  const cols = [['반납','dday'],['책 제목','title'],['대출자','borrower'],['도서관','library'],['반납예정일','dueDate'],['대출일','loanDate'],['상태','status']]
    .filter(([, k]) => k !== hide);
  return '<table><thead><tr>' + cols.map(([h]) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    list.map((r) => '<tr class="' + (r.d !== null && r.d < 0 ? 'over' : r.d !== null && r.d <= 3 ? 'soon' : '') + '">' +
      cols.map(([h, k]) => k === 'dday' ? '<td class="dday">' + ddayText(r.d) + '</td>'
        : k === 'library' || k === 'borrower' ? '<td data-l="' + h + '"><span class="chip">' + esc(r[k]) + '</span></td>'
        : '<td' + (k === 'title' ? '' : ' data-l="' + h + '"') + '>' + esc(r[k] || '') + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';
}
function render() {
  const fa = document.getElementById('fAcc').value, fl = document.getElementById('fLib').value;
  const list = rows.filter((r) => (!fa || r.borrower === fa) && (!fl || r.library === fl));
  const el = document.getElementById('list');
  if (groupBy === 'due') { el.innerHTML = table(list); return; }
  const groups = {};
  list.forEach((r) => (groups[r[groupBy]] ||= []).push(r));
  const keys = Object.keys(groups).sort();
  el.innerHTML = keys.length ? keys.map((k) => '<div class="group"><h2>' + esc(k) + ' <small>' + groups[k].length + '권</small></h2>' + table(groups[k], groupBy) + '</div>').join('')
    : table([]);
}
document.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
  groupBy = b.dataset.g;
  document.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b));
  render();
});
document.getElementById('fAcc').onchange = render;
document.getElementById('fLib').onchange = render;
render();
</script>
</body>
</html>`;
}
