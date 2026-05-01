"use client";

import type { AuthPayload } from "@/types/game";
import type { LocalTestAccount } from "@/types/localAccount";

const key = "avalon-helper-auth";
const listKey = "avalon-helper-auth-list";
const accountsKey = "avalon-helper-accounts";
const activeAccountKey = "avalon-helper-active-account";

export type StoredAuth = AuthPayload & {
  accountId: string;
  accountName: string;
};

function createId() {
  return `acct_${Math.random().toString(36).slice(2, 10)}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readAuthList(): StoredAuth[] {
  const storage = getStorage();
  const raw = storage?.getItem(listKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredAuth[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAuthList(items: StoredAuth[]) {
  const storage = getStorage();
  storage?.setItem(listKey, JSON.stringify(items));
}

function readAccounts(): LocalTestAccount[] {
  const storage = getStorage();
  const raw = storage?.getItem(accountsKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalTestAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(items: LocalTestAccount[]) {
  const storage = getStorage();
  storage?.setItem(accountsKey, JSON.stringify(items));
}

export function listAccounts() {
  return readAccounts();
}

export function loadActiveAccount(): LocalTestAccount | null {
  const storage = getStorage();
  const id = storage?.getItem(activeAccountKey);
  if (!id) return null;
  return readAccounts().find((item) => item.id === id) ?? null;
}

export function activateAccount(accountId: string) {
  const storage = getStorage();
  storage?.setItem(activeAccountKey, accountId);
}

export function createAccount(name: string) {
  const cleanName = name.trim().slice(0, 20);
  if (!cleanName) {
    throw new Error("账号名称不能为空。");
  }
  const existing = readAccounts().find((item) => item.name === cleanName);
  if (existing) {
    activateAccount(existing.id);
    return existing;
  }
  const account: LocalTestAccount = {
    id: createId(),
    name: cleanName,
    createdAt: new Date().toISOString()
  };
  writeAccounts([...readAccounts(), account]);
  activateAccount(account.id);
  return account;
}

export function getNextTestAccountName(baseName = "测试玩家") {
  const existingNames = new Set(readAccounts().map((item) => item.name));
  let index = 1;
  while (existingNames.has(`${baseName}${index}`)) {
    index += 1;
  }
  return `${baseName}${index}`;
}

export function removeAccount(accountId: string) {
  const auths = readAuthList().filter((item) => item.accountId !== accountId);
  writeAuthList(auths);
  const accounts = readAccounts().filter((item) => item.id !== accountId);
  writeAccounts(accounts);
  const storage = getStorage();
  if (storage?.getItem(activeAccountKey) === accountId) {
    if (accounts[0]) {
      activateAccount(accounts[0].id);
    } else {
      storage?.removeItem(activeAccountKey);
    }
  }
  const current = loadAuth();
  if (current && current.accountId === accountId) {
    storage?.removeItem(key);
  }
}

export function saveAuth(auth: AuthPayload) {
  const activeAccount = loadActiveAccount();
  if (!activeAccount) {
    throw new Error("请先创建并切换到一个测试账号。");
  }
  const previous = loadAuth();
  const list = previous ? [...readAuthList(), previous] : readAuthList();
  const withoutDuplicate = list.filter((item) => item.playerId !== auth.playerId);
  const storedAuth: StoredAuth = {
    ...auth,
    accountId: activeAccount.id,
    accountName: activeAccount.name
  };
  writeAuthList([...withoutDuplicate, storedAuth]);
  const storage = getStorage();
  storage?.setItem(key, JSON.stringify(storedAuth));
}

export function loadAuth(): StoredAuth | null {
  const storage = getStorage();
  const raw = storage?.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function loadAuthForRoom(roomCode: string): StoredAuth | null {
  const current = loadAuth();
  if (current?.roomCode === roomCode) return current;
  return readAuthList().find((item) => item.roomCode === roomCode) ?? null;
}

export function listAuthForRoom(roomCode: string): StoredAuth[] {
  const current = loadAuth();
  const list = current ? [...readAuthList(), current] : readAuthList();
  const byId = new Map(list.filter((item) => item.roomCode === roomCode).map((item) => [item.playerId, item]));
  return [...byId.values()];
}

export function activateAuth(auth: StoredAuth) {
  const storage = getStorage();
  storage?.setItem(key, JSON.stringify(auth));
  activateAccount(auth.accountId);
}

export function listAllAuth(): StoredAuth[] {
  const current = loadAuth();
  const list = current ? [...readAuthList(), current] : readAuthList();
  const byId = new Map(list.map((item) => [item.playerId, item]));
  return [...byId.values()];
}

export function removeAuth(target: Pick<AuthPayload, "roomCode" | "playerId">) {
  const next = readAuthList().filter(
    (item) => !(item.roomCode === target.roomCode && item.playerId === target.playerId)
  );
  writeAuthList(next);
  const current = loadAuth();
  if (current && current.roomCode === target.roomCode && current.playerId === target.playerId) {
    const storage = getStorage();
    storage?.removeItem(key);
  }
}

export function clearAuth() {
  const storage = getStorage();
  storage?.removeItem(key);
}
