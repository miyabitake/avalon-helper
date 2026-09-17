"use client";

import { useEffect, useState, type ReactNode } from "react";

export function PrivateIdentity({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hide = () => setVisible(false);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  return (
    <section className="panel stack">
      <div className="row">
        <div className="section-title">你的身份</div>
        <button className="btn secondary" aria-expanded={visible} onClick={() => setVisible(!visible)}>
          {visible ? "隐藏身份" : "显示身份"}
        </button>
      </div>
      {visible ? children : <div className="muted">身份已隐藏</div>}
    </section>
  );
}
