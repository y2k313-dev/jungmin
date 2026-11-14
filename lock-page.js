// 대시보드 HTML 을 비밀번호로 암호화한 한 장짜리 페이지로 만듭니다.
// 공개 웹에 올라가도 비밀번호를 모르면 내용을 볼 수 없습니다 (AES-256-GCM, PBKDF2-SHA256).
import crypto from 'node:crypto';

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
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#2f6b4f">
<title>도서관 대출 현황</title>
<style>
  :root { --bg:#f6f5f1; --card:#fff; --text:#1d1d1b; --muted:#6b6a65; --line:#e4e2db; --accent:#2f6b4f; --danger:#c0392b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#161614; --card:#1f1f1c; --text:#ecebe6; --muted:#9b9a93; --line:#33332f; --accent:#7fc4a0; --danger:#ff8a7a; } }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--text);
    font-family:"Pretendard","Malgun Gothic",system-ui,sans-serif; }
  form { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:28px 24px; width:min(340px, calc(100vw - 32px)); box-sizing:border-box; }
  h1 { font-size:1.2rem; margin:0 0 4px; } p { color:var(--muted); font-size:.9rem; margin:0 0 16px; }
  input[type=password] { width:100%; box-sizing:border-box; font:inherit; font-size:1rem; padding:12px; border-radius:10px; border:1px solid var(--line); background:var(--bg); color:var(--text); }
  label { display:flex; gap:6px; align-items:center; margin:12px 0; font-size:.9rem; color:var(--muted); }
  button { width:100%; font:inherit; padding:12px; border:0; border-radius:10px; background:var(--accent); color:var(--card); font-weight:600; cursor:pointer; }
  .err { color:var(--danger); font-size:.85rem; min-height:1.2em; margin-top:8px; }
</style>
</head>
<body>
<form id="f">
  <h1>📚 도서관 대출 현황</h1>
  <p>비밀번호를 입력하세요</p>
  <input type="password" id="pw" autocomplete="current-password" autofocus>
  <label><input type="checkbox" id="rem" checked> 이 기기에서 기억하기</label>
  <button>열기</button>
  <div class="err" id="err"></div>
</form>
<script>
const P = ${payload};
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function open(pw) {
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
  const pw = document.getElementById('pw').value;
  try {
    if (document.getElementById('rem').checked) store.set(pw);
    await open(pw);
  } catch {
    store.set(null);
    document.getElementById('err').textContent = '비밀번호가 맞지 않아요';
  }
};
</script>
</body>
</html>`;
}
