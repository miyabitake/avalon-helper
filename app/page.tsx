import Link from "next/link";
import { SavedRoomsPanel } from "@/components/SavedRoomsPanel";

export default function HomePage() {
  return (
    <main className="page">
      <section className="panel stack">
        <h1 className="title">线下阿瓦隆辅助工具</h1>
        <p className="muted">房间、发牌、私有视野、投票、任务、刺杀和记录都交给后端处理。</p>
        <Link className="btn" href="/create">创建房间</Link>
        <Link className="btn secondary" href="/join">加入房间</Link>
      </section>
      <SavedRoomsPanel />
    </main>
  );
}
