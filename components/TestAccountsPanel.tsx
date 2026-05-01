"use client";

import { useMemo, useState } from "react";
import {
  activateAccount,
  createAccount,
  listAccounts,
  loadActiveAccount,
  removeAccount
} from "@/lib/clientAuth";

export function TestAccountsPanel() {
  const [name, setName] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const accounts = useMemo(() => listAccounts(), [version]);
  const active = useMemo(() => loadActiveAccount(), [version]);

  return (
    <section className="panel stack">
      <strong>测试账号</strong>
      <div className="muted">先创建测试账号，再切换账号后去创建房间或加入房间。</div>
      <div className="row">
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：麦茶、阿青、老王"
        />
        <button
          className="btn"
          onClick={() => {
            try {
              createAccount(name);
              setName("");
              setError("");
              setVersion((value) => value + 1);
            } catch (err) {
              setError(err instanceof Error ? err.message : "创建账号失败");
            }
          }}
        >
          建立账号
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {accounts.length ? (
        accounts.map((account) => (
          <div className="record" key={account.id}>
            <div className="row">
              <b>{account.name}</b>
              {active?.id === account.id ? <span className="pill">当前账号</span> : null}
            </div>
            <div className="row">
              <button
                className="btn secondary"
                onClick={() => {
                  activateAccount(account.id);
                  setVersion((value) => value + 1);
                }}
              >
                切换到此账号
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  removeAccount(account.id);
                  setVersion((value) => value + 1);
                }}
              >
                删除账号
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="muted">还没有测试账号。</div>
      )}
    </section>
  );
}
