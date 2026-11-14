// 대시보드 HTML 을 비밀번호로 암호화한 한 장짜리 페이지로 만듭니다.
// 공개 웹에 올라가도 비밀번호를 모르면 내용을 볼 수 없습니다 (AES-256-GCM, PBKDF2-SHA256).
import crypto from 'node:crypto';
import { M3_TOKENS } from './theme.js';

const ITER = 300000;

export function renderLocked(html, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, ITER, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(html, 'utf8'), c.final(), c.getAuthTag()]);
  const payload = JSON.stringify({ s: salt.toString('base64'), i: iv.toString('base64'), d: enc.toString('base64'), n: ITER });

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#f6fbf5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1511" media="(prefers-color-scheme: dark)">
<title>도서관 대출 현황</title>
<style>
${M3_TOKENS}
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px;
    background: var(--surface); color: var(--on-surface);
    font-family: Roboto, "Noto Sans KR", "Pretendard", "Malgun Gothic", system-ui, sans-serif; -webkit-tap-highlight-color: transparent; }
  form { background: var(--surface-container-high); border-radius: 28px; padding: 24px; width: min(360px, 100%); }
  .icon { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 16px;
    background: var(--primary-container); color: var(--on-primary-container); }
  h1 { font-size: 24px; line-height: 32px; font-weight: 400; margin: 0 0 4px; }
  p { color: var(--on-surface-variant); font-size: 14px; line-height: 20px; margin: 0 0 24px; }
  .field { position: relative; }
  .field input { width: 100%; height: 56px; font: inherit; font-size: 16px; padding: 0 16px; border-radius: 4px;
    border: 1px solid var(--outline); background: transparent; color: var(--on-surface); }
  .field input:focus { outline: none; border: 2px solid var(--primary); padding: 0 15px; }
  .field label { position: absolute; top: -9px; left: 12px; padding: 0 4px; font-size: 12px; line-height: 16px;
    color: var(--on-surface-variant); background: var(--surface-container-high); }
  .field input:focus + label { color: var(--primary); }
  .field.bad input { border: 2px solid var(--error); padding: 0 15px; }
  .field.bad label { color: var(--error); }
  .err { color: var(--error); font-size: 12px; line-height: 16px; min-height: 16px; margin: 4px 16px 0; }
  .check { display: flex; align-items: center; gap: 12px; min-height: 48px; margin: 8px 0 16px; cursor: pointer; font-size: 14px; }
  .check input { width: 18px; height: 18px; margin: 15px; accent-color: var(--primary); cursor: pointer; }
  .check span { margin-left: -12px; }
  button { width: 100%; height: 48px; font: inherit; font-size: 14px; font-weight: 500; letter-spacing: .1px; border: 0;
    border-radius: 999px; background: var(--primary); color: var(--on-primary); cursor: pointer; }
  button:disabled { opacity: .6; }
  button:focus-visible, .check input:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
</style>
</head>
<body>
<form id="f">
  <div class="icon" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
  </div>
  <h1>도서관 대출 현황</h1>
  <p>비밀번호를 입력하면 대출 목록이 열려요</p>
  <div class="field" id="fld">
    <input type="password" id="pw" autocomplete="current-password" enterkeyhint="go" placeholder=" " aria-describedby="err">
    <label for="pw">비밀번호</label>
  </div>
  <div class="err" id="err" role="alert"></div>
  <label class="check"><input type="checkbox" id="rem" checked><span>이 기기에서 기억하기</span></label>
  <button id="btn">열기</button>
</form>
<script>
const P = ${payload};
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function open(pw) {
  if (!window.crypto || !crypto.subtle) throw new Error('insecure');
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(P.s), iterations: P.n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.i) }, key, b64(P.d));
  const html = new TextDecoder().decode(plain);
  document.open(); document.write(html); document.close();
}
const store = { get() { try { return localStorage.getItem('libdash-pw'); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem('libdash-pw', v) : localStorage.removeItem('libdash-pw'); } catch {} } };
const saved = store.get();
if (saved) open(saved).catch(() => store.set(null));
document.getElementById('f').onsubmit = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn'), fld = document.getElementById('fld'), err = document.getElementById('err');
  const pw = document.getElementById('pw').value;
  btn.disabled = true; btn.textContent = '여는 중…';
  try {
    if (document.getElementById('rem').checked) store.set(pw);
    await open(pw);
  } catch (ex) {
    store.set(null);
    fld.classList.add('bad');
    err.textContent = ex.message === 'insecure' ? 'https 주소로 열어 주세요' : '비밀번호가 맞지 않아요';
    btn.disabled = false; btn.textContent = '열기';
  }
};
document.getElementById('pw').oninput = () => { document.getElementById('fld').classList.remove('bad'); document.getElementById('err').textContent = ''; };
</script>
</body>
</html>`;
}
