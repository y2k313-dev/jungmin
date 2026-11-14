import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');
export const KEYRING_SERVICE = 'snlib-dashboard';

// keyring 은 내 PC(윈도우)에서만 필요하므로 필요할 때만 불러옵니다.
let keyringMod;
async function keyring() {
  keyringMod ??= await import('@napi-rs/keyring');
  return keyringMod;
}

// GitHub Actions 에서는 비밀값(Secrets)이 환경변수로 들어옵니다.
//  - SNLIB_ID / SNLIB_PW / SNLIB_NAME : 계정 하나 (가족회원이면 하나로 충분)
//  - SNLIB_ACCOUNTS : 여러 계정일 때 [{"name":"엄마","userId":"..","password":".."}]
export function envAccounts() {
  const list = [];
  if (process.env.SNLIB_ACCOUNTS) {
    for (const a of JSON.parse(process.env.SNLIB_ACCOUNTS)) {
      list.push({ name: a.name || a.userId, userId: a.userId, password: a.password });
    }
  }
  if (process.env.SNLIB_ID && process.env.SNLIB_PW) {
    list.push({ name: process.env.SNLIB_NAME || process.env.SNLIB_ID, userId: process.env.SNLIB_ID, password: process.env.SNLIB_PW });
  }
  return list;
}

// accounts.json 에는 별명과 아이디만 저장합니다. 비밀번호는 윈도우 자격 증명 관리자에만 있습니다.
export function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

export async function getPassword(userId) {
  const { Entry } = await keyring();
  return new Entry(KEYRING_SERVICE, userId).getPassword();
}

export async function setPassword(userId, pw) {
  const { Entry } = await keyring();
  new Entry(KEYRING_SERVICE, userId).setPassword(pw);
}

export async function deletePassword(userId) {
  try {
    const { Entry } = await keyring();
    new Entry(KEYRING_SERVICE, userId).deletePassword();
  } catch {
    /* 이미 없음 */
  }
}
