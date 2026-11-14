// 계정 등록/삭제 도구. 실행: node setup-accounts.js
import readline from 'node:readline';
import {
  loadAccounts, saveAccounts, getPassword, setPassword, deletePassword,
} from './common.js';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

// 화면에 * 로 가려서 비밀번호 입력받기
function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let pw = '';
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(pw);
          return;
        }
        if (c === '\u0003') { process.stdout.write('\n'); process.exit(1); } // Ctrl+C
        if (c === '\b' || c === '\u007f') {
          if (pw.length) { pw = pw.slice(0, -1); process.stdout.write('\b \b'); }
        } else {
          pw += c;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function list(accounts) {
  if (!accounts.length) { console.log('  (등록된 계정 없음)'); return; }
  for (const [i, a] of accounts.entries()) {
    let ok = false;
    try { ok = !!(await getPassword(a.userId)); } catch { /* 없음 */ }
    console.log(`  ${i + 1}. ${a.name}  (${a.userId})  비밀번호: ${ok ? '저장됨' : '없음!'}`);
  }
}

async function main() {
  for (;;) {
    const accounts = loadAccounts();
    console.log('\n=== 성남시도서관 계정 관리 ===');
    await list(accounts);
    console.log('\n[1] 계정 추가  [2] 비밀번호 변경  [3] 계정 삭제  [0] 종료');
    const choice = await ask('선택: ');

    if (choice === '1') {
      const name = await ask('별명 (예: 엄마, 첫째): ');
      const userId = await ask('도서관 아이디: ');
      if (!name || !userId) { console.log('취소했어요.'); continue; }
      if (accounts.some((a) => a.userId === userId)) { console.log('이미 등록된 아이디예요.'); continue; }
      const pw = await askHidden('비밀번호: ');
      if (!pw) { console.log('취소했어요.'); continue; }
      await setPassword(userId, pw);
      accounts.push({ name, userId });
      saveAccounts(accounts);
      console.log(`✔ ${name} 등록 완료 (비밀번호는 윈도우 자격 증명 관리자에 저장됨)`);
    } else if (choice === '2') {
      const n = Number(await ask('번호: ')) - 1;
      const a = accounts[n];
      if (!a) { console.log('번호가 올바르지 않아요.'); continue; }
      const pw = await askHidden(`${a.name} 새 비밀번호: `);
      if (pw) { await setPassword(a.userId, pw); console.log('✔ 변경 완료'); }
    } else if (choice === '3') {
      const n = Number(await ask('번호: ')) - 1;
      const a = accounts[n];
      if (!a) { console.log('번호가 올바르지 않아요.'); continue; }
      await deletePassword(a.userId);
      accounts.splice(n, 1);
      saveAccounts(accounts);
      console.log(`✔ ${a.name} 삭제 완료`);
    } else if (choice === '0' || choice === '') {
      break;
    }
  }
}

main();
