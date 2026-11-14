// 이 PC에 등록한 계정(setup-accounts.js)을 GitHub 비밀값 SNLIB_ACCOUNTS 형식으로 만들어 클립보드에 복사합니다.
// 화면에는 비밀번호를 출력하지 않습니다. 실행: node make-secret.js
import { execSync } from 'node:child_process';
import { loadAccounts, getPassword } from './common.js';

const accounts = loadAccounts();
if (!accounts.length) {
  console.log('등록된 계정이 없어요. 먼저 계정관리.bat 으로 등록하세요.');
  process.exit(1);
}

const list = [];
for (const a of accounts) {
  let password = null;
  try { password = await getPassword(a.userId); } catch { /* 없음 */ }
  if (!password) { console.log(`✖ ${a.name}: 비밀번호가 저장돼 있지 않아 건너뛰어요.`); continue; }
  list.push({ name: a.name, userId: a.userId, password });
  console.log(`✔ ${a.name} (${a.userId})`);
}

// 한글이 클립보드에서 깨지지 않도록 영문/숫자 외 문자는 \uXXXX 로 바꿉니다 (JSON 으로는 같은 값)
const json = JSON.stringify(list).replace(/[^\x00-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
execSync('clip', { input: json });
console.log(`\n${list.length}개 계정을 클립보드에 복사했어요.`);
console.log('GitHub → Settings → Secrets and variables → Actions → New repository secret');
console.log('  Name: SNLIB_ACCOUNTS   Secret: 여기에 붙여넣기(Ctrl+V)');
