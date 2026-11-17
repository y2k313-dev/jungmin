// 등록된 모든 계정에 로그인해서 대출 현황을 가져오고 dashboard.html 을 만듭니다.
// 실행: node fetch-loans.js          (--debug 를 붙이면 받은 페이지를 debug 폴더에 저장)
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import * as cheerio from 'cheerio';
import { ROOT, loadAccounts, getPassword, envAccounts } from './common.js';
import { renderDashboard } from './dashboard-template.js';
import { renderLocked } from './lock-page.js';

const BASE = 'https://www.snlib.go.kr';
const LOGIN_URL = `${BASE}/intro/menu/10068/program/30025/memberLoginProc.do`;
const LOAN_URL = `${BASE}/intro/menu/10060/program/30019/mypage/loanStatusList.do`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DEBUG = process.argv.includes('--debug');
const DEBUG_DIR = path.join(ROOT, 'debug');
const AUTO_EXTEND = process.argv.includes('--extend') || /^(1|true|yes)$/i.test(process.env.AUTO_EXTEND || '');

// ---------- 간단한 쿠키 세션 ----------
class Session {
  constructor() { this.cookies = new Map(); }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  store(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }

  async request(url, { method = 'GET', body, extraHeaders = {} } = {}) {
    let current = url;
    let opts = { method, body };
    for (let hop = 0; hop < 10; hop++) {
      const headers = { 'User-Agent': UA, Cookie: this.cookieHeader(), Referer: `${BASE}/intro/index.do`, ...(hop === 0 ? extraHeaders : {}) };
      if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const res = await fetch(current, { method: opts.method, body: opts.body, headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      this.store(res);
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), current).href;
        opts = { method: 'GET' };
        continue;
      }
      return { url: current, status: res.status, html: await res.text() };
    }
    throw new Error('리다이렉트가 너무 많아요');
  }
}

// ---------- 파싱 도우미 ----------
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const DATE_RE = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/;

function toDate(s) {
  const m = DATE_RE.exec(s || '');
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function alertText(html) {
  const m = /alert\(\s*["']([^"']+)["']\s*\)/.exec(html);
  return m ? m[1].replace(/\\n/g, ' ') : '';
}

export function isLoginPage(html) {
  // 로그인 안 된 상태로 마이페이지에 가면 로그인 화면으로 보내는 작은 페이지가 옵니다
  return /redirectForm/.test(html) && /memberLogin\.do/.test(html);
}

// 표(table) 형식
function parseTables($) {
  const items = [];
  $('table').each((_, t) => {
    const headers = $(t).find('thead th, tr:first-child th').map((__, th) => norm($(th).text())).get();
    if (!headers.some((h) => /반납/.test(h))) return;
    const col = (re) => headers.findIndex((h) => re.test(h));
    const idx = {
      title: col(/서명|도서명|자료명|제목/),
      library: col(/도서관|소장처|대출처|대출관/),
      loanDate: col(/대출일/),
      dueDate: col(/반납\s*(예정)?\s*일/),
      status: col(/상태|연체/),
      renew: col(/연장/),
    };
    $(t).find('tbody tr').each((__, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return; // "대출 중인 자료가 없습니다" 같은 행
      const cell = (i) => (i >= 0 ? norm($(tds[i]).text()) : '');
      const item = {
        title: cell(idx.title),
        library: cell(idx.library),
        loanDate: toDate(cell(idx.loanDate)),
        dueDate: toDate(cell(idx.dueDate)),
        status: cell(idx.status),
        renew: cell(idx.renew),
      };
      if (item.title || item.dueDate) items.push(item);
    });
  });
  return items;
}

// 목록(li / div) 형식: "반납예정일 : 2026.11.20" 같은 텍스트에서 뽑기
function parseLists($) {
  const items = [];
  $('li, .bookList > div, .book-list > div').each((_, el) => {
    const $el = $(el);
    const text = norm($el.text());
    if (!/반납\s*예정/.test(text)) return;
    // 안쪽에 같은 정보를 가진 더 작은 항목이 있으면 그쪽을 사용
    if ($el.find('li').filter((__, c) => /반납\s*예정/.test($(c).text())).length) return;

    const field = (label) => {
      const m = new RegExp(`${label}\\s*[:：]?\\s*([^|\\n]*?\\d{4}\\s*[.\\-/]\\s*\\d{1,2}\\s*[.\\-/]\\s*\\d{1,2})`).exec(text);
      return m ? toDate(m[1]) : '';
    };
    const titleEl = $el.find('.tit, .title, .book_name, .bookTitle, .book-title, dt a, strong a, a').first();
    let library = '';
    const libLabel = /(?:소장처|소장\s*도서관|대출\s*도서관|도서관)\s*[:：]\s*([가-힣A-Za-z0-9() ]+?도서관|[가-힣A-Za-z0-9()]+)/.exec(text);
    if (libLabel) library = libLabel[1].trim();
    else {
      const any = /([가-힣]+(?:작은)?도서관)/.exec(text);
      if (any) library = any[1];
    }
    const status = /연체/.test(text) ? (/(연체\s*\d+\s*일)/.exec(text)?.[1] ?? '연체') : '';
    const renew = /(연장\s*(?:횟수)?\s*[:：]?\s*\d+(?:\s*\/\s*\d+)?\s*회?)/.exec(text)?.[1] ?? '';
    items.push({
      title: norm(titleEl.text()) || text.slice(0, 60),
      library,
      loanDate: field('대출일'),
      dueDate: field('반납\\s*예정일?'),
      status,
      renew,
    });
  });
  return items;
}

// 성남시도서관 실제 구조: ul.article-list > li 안에 p.title / p.info > span "라벨 : 값"
function parseSnlib($) {
  const items = [];
  $('ul.article-list > li').each((_, el) => {
    const $el = $(el);
    const title = norm($el.find('p.title').text());
    if (!title) return; // "전체선택" 줄
    const fields = {};
    $el.find('p.info span, p.info').each((__, s) => {
      const $s = $(s);
      if ($s.is('p') && $s.find('span').length) return;
      const m = /^([^:：]+?)\s*[:：]\s*(.*)$/.exec(norm($s.text()));
      if (m) fields[m[1]] = m[2];
    });
    // 사이트가 연장(반납연기) 가능한 책에만 체크박스(name=check)를 활성화해 둡니다.
    // 값 형식: recKey^regNo^manageCode^publishFormCode^title
    const cb = $el.find('input[type=checkbox][name=check]:not([disabled])');
    const parts = (cb.attr('value') || '').split('^');
    const extendKey = cb.length && parts.length >= 4
      ? { recKey: parts[0], regNo: parts[1], manageCode: parts[2], publishFormCode: parts[3] } : null;
    items.push({
      canExtend: !!extendKey,
      extendKey,
      title,
      borrower: fields['대출자'] || '',
      library: fields['소장도서관'] || '',
      room: fields['자료실'] || '',
      loanDate: toDate(fields['대출일']),
      dueDate: toDate(fields['반납예정일']),
      status: fields['상태'] || '',
      renew: fields['연장횟수'] || fields['연장'] || '',
    });
  });
  return items;
}

export function parseLoans(html) {
  const $ = cheerio.load(html);
  let items = parseSnlib($);
  if (!items.length) items = parseTables($);
  if (!items.length) items = parseLists($);
  const empty = /대출\s*(중인|하신)?\s*(자료|도서|내역)[^<]{0,10}없/.test(html);
  const total = Number(/대출현황건수\s*:\s*<span[^>]*>\s*(\d+)/.exec(html)?.[1] ?? NaN);
  // 가족회원 선택 상자: 이름 → 이용자키 (가족 책을 연장할 때 그 사람의 키가 필요함)
  const family = {};
  $('#searchUserKeySel option').each((_, o) => { const v = $(o).attr('value'); if (v && v !== 'ALL') family[norm($(o).text())] = v; });
  const ownKey = $('#searchUserKey').attr('value') || '';
  return { items, empty, total, family, ownKey };
}

// ---------- 계정별 조회 ----------
async function fetchAccount(acc) {
  let password = acc.password;
  if (!password) {
    try { password = await getPassword(acc.userId); } catch { password = null; }
  }
  if (!password) return { ...acc, error: '저장된 비밀번호가 없어요. setup-accounts.js 로 등록하세요.', loans: [] };

  const s = new Session();
  await s.request(`${BASE}/intro/memberLogin.do`); // 세션 쿠키 받기
  const body = new URLSearchParams({ returnUrl: '', userId: acc.userId, password }).toString();
  const login = await s.request(LOGIN_URL, { method: 'POST', body });
  const loginMsg = alertText(login.html);

  if (DEBUG) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    fs.writeFileSync(path.join(DEBUG_DIR, `${acc.userId}-login.html`), login.html);
  }
  let list = await loadAll(s, acc);
  if (list.loggedOut) return { ...acc, error: `로그인 실패${loginMsg ? `: ${loginMsg}` : ''}`, loans: [] };

  // 자동 연장: 사이트가 연장 가능하다고 표시한 책만 신청합니다 (연체·예약·DVD 등은 사이트가 막아 둠)
  const extended = [];
  if (AUTO_EXTEND) {
    // 사이트의 "일괄연기신청" 버튼과 같은 방식: 대출자(가족 구성원)별 이용자키를 함께 보냅니다
    const byKey = new Map();
    for (const it of list.items.filter((x) => x.canExtend)) {
      const key = list.family[it.borrower] || list.ownKey;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(it);
    }
    for (const [userKey, books] of byKey) {
      await s.request(`${LOAN_URL}?searchUserKey=${encodeURIComponent(userKey)}`); // 그 사람 목록을 먼저 열기
      const payload = books.map((it) => ({ ...it.extendKey, title: it.title, searchUserKey: userKey }));
      const res = await s.request(`${BASE}/loan/returnDelayBatchProc.do`, {
        method: 'POST',
        body: JSON.stringify(payload),
        extraHeaders: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', Referer: LOAN_URL },
      });
      let msg = '';
      try { msg = JSON.parse(res.html).msg || ''; } catch { msg = `응답 확인 불가 (HTTP ${res.status})`; }
      for (const it of books) extended.push({ title: it.title, borrower: it.borrower, before: it.dueDate, msg });
      await new Promise((r) => setTimeout(r, 500));
    }
    if (extended.length) {
      list = await loadAll(s, acc); // 바뀐 반납일 다시 읽기
      for (const e of extended) {
        const now = list.items.find((x) => x.title === e.title && x.borrower === e.borrower);
        e.after = now?.dueDate || '';
        e.ok = !!e.after && e.after !== e.before;
      }
    }
  }

  const { items, empty, total } = list;
  for (const it of items) delete it.extendKey; // 결과 페이지에는 신청용 값은 넣지 않습니다
  let warning = '';
  if (!items.length && !empty && !(total === 0)) warning = '대출 목록을 읽지 못했어요. npm run debug 로 실행해서 debug 폴더의 파일을 확인해 주세요.';
  else if (Number.isFinite(total) && items.length !== total) warning = `사이트에는 ${total}건인데 ${items.length}건만 읽었어요.`;
  for (const it of items) if (!it.borrower) it.borrower = acc.name;
  return { ...acc, loans: items, warning, extended };
}

// 가족회원 전체(searchUserKey=ALL)의 대출을 쪽(page)마다 모두 가져오기
async function loadAll(s, acc) {
  const items = [];
  let empty = false;
  let total = NaN;
  let family = {};
  let ownKey = "";
  for (let page = 1; page <= 20; page++) {
    const loan = await s.request(`${LOAN_URL}?searchUserKey=ALL&searchLibrary=ALL&currentPageNo=${page}`);
    if (DEBUG) fs.writeFileSync(path.join(DEBUG_DIR, `${acc.userId}-loan-p${page}.html`), loan.html);
    if (isLoginPage(loan.html)) return { loggedOut: true };
    const r = parseLoans(loan.html);
    if (page === 1) { empty = r.empty; total = r.total; family = r.family; ownKey = r.ownKey; }
    const before = items.length;
    for (const it of r.items) {
      if (!items.some((x) => x.title === it.title && x.borrower === it.borrower && x.loanDate === it.loanDate)) items.push(it);
    }
    if (items.length === before || !(items.length < total)) break;
  }
  return { items, empty, total, family, ownKey };
}

async function main() {
  const CI = !!process.env.GITHUB_ACTIONS;
  const accounts = CI ? envAccounts() : loadAccounts();
  if (!accounts.length) {
    if (CI) {
      const has = (k) => (process.env[k] ? '있음' : '없음');
      console.log('도서관 계정 비밀값(Secrets)이 비어 있어요.');
      console.log(`  SNLIB_ACCOUNTS: ${has('SNLIB_ACCOUNTS')} / SNLIB_ID: ${has('SNLIB_ID')} / SNLIB_PW: ${has('SNLIB_PW')} / DASHBOARD_PASSWORD: ${has('DASHBOARD_PASSWORD')}`);
      console.log('  Settings → Secrets and variables → Actions → "Repository secrets" 에 넣었는지 확인하세요.');
    } else {
      console.log('등록된 계정이 없어요. 먼저 실행하세요:  node setup-accounts.js');
    }
    process.exit(1);
  }
  const results = [];
  for (const [i, acc] of accounts.entries()) {
    // GitHub 공개 저장소의 실행 기록은 누구나 볼 수 있어서, CI 에서는 이름/아이디를 찍지 않습니다
    const label = CI ? `계정 ${i + 1}` : `${acc.name} (${acc.userId})`;
    process.stdout.write(`- ${label} 조회 중... `);
    try {
      const r = await fetchAccount(acc);
      results.push(r);
      console.log(r.error ? `✖ ${CI ? '실패' : r.error}` : `✔ ${CI ? '완료' : `${r.loans.length}권`}${r.warning && !CI ? ` (⚠ ${r.warning})` : ''}`);
    } catch (e) {
      results.push({ ...acc, error: `연결 오류: ${e.message}`, loans: [] });
      console.log(`✖ 연결 오류: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 800)); // 서버에 부담 주지 않도록 잠깐 쉬기
  }

  // 비밀번호는 결과에 넣지 않습니다
  const data = results.map(({ name, userId, loans, error, warning, extended }) => ({ name, userId, loans, error, warning, extended: extended || [] }));
  const ext = results.flatMap((r) => r.extended || []);
  if (AUTO_EXTEND) console.log(ext.length ? `자동 연장 신청 ${ext.length}권 (성공 ${ext.filter((e) => e.ok).length}권)` : '자동 연장: 오늘 연장 가능한 책 없음');
  // 상단 "업데이트" 버튼: 웹 앱 주소와 키는 GitHub 비밀값(UPDATE_URL, UPDATE_KEY)으로만 받고, 암호화된 페이지 안에만 들어갑니다
  const update = process.env.UPDATE_URL && process.env.UPDATE_KEY
    ? { url: process.env.UPDATE_URL.trim(), key: process.env.UPDATE_KEY.trim(), repo: process.env.GITHUB_REPOSITORY || "y2k313-dev/jungmin" } : null;
  const html = renderDashboard(data, new Date(), { update });

  const viewPw = process.env.DASHBOARD_PASSWORD;
  if (CI || viewPw) {
    if (!viewPw) { console.log('DASHBOARD_PASSWORD 비밀값이 없어요.'); process.exit(1); }
    // 모든 계정이 실패하면 이전 페이지를 덮어쓰지 않도록 실패로 끝냅니다 (GitHub 가 메일로 알려줌)
    if (results.every((r) => r.error)) { console.log('모든 계정 조회에 실패했어요.'); process.exit(1); }
    const siteDir = path.join(ROOT, 'site');
    fs.mkdirSync(siteDir, { recursive: true });
    fs.writeFileSync(path.join(siteDir, 'index.html'), renderLocked(html, viewPw), 'utf8');
    console.log('\n잠긴 페이지 저장: site/index.html');
    return;
  }

  const out = path.join(ROOT, 'dashboard.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log(`\n대시보드 저장: ${out}`);
  if (!process.argv.includes('--no-open')) exec(`start "" "${out}"`);
}

if (!process.env.NO_MAIN) main();
