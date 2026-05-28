"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Plus, Trash2, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Project = {
  id: number; category: string; orderNum: number; name: string; leader: string;
  submitDate: string | null; presentDate: string | null; openDate: string | null;
  cost: number | null; notes: string | null; weekLabel: string;
};
type ExpectedProject = {
  id: number; orderNum: number; name: string | null; client: string | null;
  leader: string | null; budget: number | null; planMonth: string | null;
  serviceCost: number | null; notes: string | null; weekLabel: string;
};
type Participant = { id: number; name: string; role: string; company: string | null; };

// ── Week utils ───────────────────────────────────────────────────────────────
function parseWeek(label: string) {
  const [y, w] = label.split("-W");
  return { year: Number(y), week: Number(w) };
}
function formatWeek(year: number, week: number) {
  return `${year}-W${String(week).padStart(2, "0")}`;
}
function shiftWeek(label: string, delta: number) {
  const { year, week } = parseWeek(label);
  let w = week + delta, y = year;
  if (w < 1) { y -= 1; w = 52; } else if (w > 52) { y += 1; w = 1; }
  return formatWeek(y, w);
}
function weekToMonday(label: string) {
  const { year, week } = parseWeek(label);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const m = new Date(jan4);
  m.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
  return m;
}
function weekDisplayRange(label: string) {
  const mon = weekToMonday(label);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const f = (d: Date) => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}.`;
  return `${f(mon)} ~ ${f(fri)}`;
}

// ── EditableCell ─────────────────────────────────────────────────────────────
function EditableCell({ value, onSave, type = "text", align = "left", placeholder = "-" }: {
  value: string | number | null; onSave: (v: string) => void;
  type?: string; align?: "left" | "center"; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { setDraft(String(value ?? "")); setTimeout(() => ref.current?.select(), 0); }
  }, [editing, value]);

  function commit() {
    setEditing(false);
    if (draft !== String(value ?? "")) onSave(draft);
  }

  if (editing) return (
    <input ref={ref} type={type} value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setEditing(false); setDraft(String(value ?? "")); }
      }}
      className={`w-full min-w-[60px] rounded px-1.5 py-0.5 text-sm outline-none border ${align === "center" ? "text-center" : ""}`}
      style={{ background: "var(--canvas)", borderColor: "var(--primary)", boxShadow: "0 0 0 2px rgba(204,120,92,0.15)" }}
    />
  );

  const disp = value !== null && value !== "" ? String(value) : null;
  return (
    <span onClick={() => setEditing(true)} title="클릭하여 편집"
      className={`cursor-pointer block w-full px-1.5 py-0.5 rounded text-sm min-h-[24px] transition-colors ${align === "center" ? "text-center" : ""}`}
      style={{ color: disp ? "var(--body-strong)" : undefined }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-card)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {disp ?? <span style={{ color: "var(--muted-soft)", fontSize: 11 }}>{placeholder}</span>}
    </span>
  );
}

// ── ParticipantAddForm ────────────────────────────────────────────────────────
function ParticipantAddForm({ role, onAdd }: {
  role: string; onAdd: (role: string, name: string, company: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [company, setCompany] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  function reset() { setName(""); setCompany(""); setOpen(false); }
  async function submit() { if (!name.trim()) return; await onAdd(role, name, company); reset(); }
  if (!open) return (
    <button onClick={() => { setOpen(true); setTimeout(() => nameRef.current?.focus(), 0); }}
      className="flex items-center gap-1 text-xs mt-1 transition-colors"
      style={{ color: "var(--muted-soft)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
    >
      <Plus size={11} /> 추가
    </button>
  );
  return (
    <div className="mt-1.5 space-y-1">
      <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") reset(); }}
        placeholder="이름" className="w-full text-xs rounded px-1.5 py-0.5 outline-none border"
        style={{ borderColor: "var(--hairline)", background: "var(--canvas)" }}
      />
      <input value={company} onChange={(e) => setCompany(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") reset(); }}
        placeholder="회사 (선택)" className="w-full text-xs rounded px-1.5 py-0.5 outline-none border"
        style={{ borderColor: "var(--hairline)", background: "var(--canvas)" }}
      />
      <div className="flex gap-1">
        <button onClick={submit} className="text-xs text-white px-2 py-0.5 rounded"
          style={{ background: "var(--primary)" }}>추가</button>
        <button onClick={reset} className="text-xs px-1" style={{ color: "var(--muted)" }}>취소</button>
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl px-5 py-4 border"
      style={{
        background: "var(--canvas)",
        borderColor: accent ? "var(--primary)" : "var(--hairline)",
        borderLeftWidth: accent ? 3 : 1,
      }}>
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-display mt-1" style={{ color: accent ? "var(--primary)" : "var(--ink)", fontSize: 26 }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted-soft)" }}>{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [currentWeek, setCurrentWeek] = useState("2026-W09");
  const [projects, setProjects] = useState<Project[]>([]);
  const [expected, setExpected] = useState<ExpectedProject[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function loadAll(week: string) {
    setLoading(true);
    const [pR, eR, ptR] = await Promise.all([
      fetch(`/api/projects?week=${week}`),
      fetch(`/api/expected-projects?week=${week}`),
      fetch("/api/participants"),
    ]);
    setProjects(await pR.json());
    setExpected(await eR.json());
    setParticipants(await ptR.json());
    setLoading(false);
  }
  useEffect(() => { loadAll(currentWeek); }, [currentWeek]);

  async function handleSeed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await loadAll(currentWeek);
    setSeeding(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/export/hwpx?week=${currentWeek}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disp = res.headers.get("content-disposition") ?? "";
      const m = disp.match(/filename\*=UTF-8''(.+)/);
      a.download = m ? decodeURIComponent(m[1]) : `주간업무_${currentWeek}.hwpx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("HWPX 내보내기 실패: " + String(e)); }
    finally { setExporting(false); }
  }

  // Project CRUD
  async function saveProject(id: number, field: string, rawVal: string) {
    const value = field === "cost" || field === "orderNum"
      ? (rawVal === "" ? null : Number(rawVal)) : rawVal || null;
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
  }
  async function addProject(category: string) {
    const existing = projects.filter((p) => p.category === category);
    const maxNum = existing.length > 0 ? Math.max(...existing.map((p) => p.orderNum)) : 0;
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, orderNum: maxNum + 1, name: "", leader: "", weekLabel: currentWeek }) });
    const created = await res.json();
    setProjects((prev) => [...prev, created]);
  }
  async function moveProject(id: number, category: string, direction: "up" | "down") {
    const section = projects.filter((p) => p.category === category).sort((a, b) => a.orderNum - b.orderNum);
    const idx = section.findIndex((p) => p.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === section.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const [cur, swp] = [section[idx], section[swapIdx]];
    setProjects((prev) => prev.map((p) => p.id === cur.id ? { ...p, orderNum: swp.orderNum } : p.id === swp.id ? { ...p, orderNum: cur.orderNum } : p));
    await Promise.all([
      fetch(`/api/projects/${cur.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNum: swp.orderNum }) }),
      fetch(`/api/projects/${swp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNum: cur.orderNum }) }),
    ]);
  }
  async function deleteProject(id: number) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  }

  // ExpectedProject CRUD
  async function saveExpected(id: number, field: string, rawVal: string) {
    const value = field === "budget" || field === "serviceCost"
      ? (rawVal === "" ? null : Number(rawVal)) : rawVal || null;
    setExpected((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    await fetch(`/api/expected-projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
  }
  async function addExpected() {
    const maxNum = expected.length > 0 ? Math.max(...expected.map((e) => e.orderNum)) : 0;
    const res = await fetch("/api/expected-projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNum: maxNum + 1, weekLabel: currentWeek }) });
    const created = await res.json();
    setExpected((prev) => [...prev, created]);
  }
  async function deleteExpected(id: number) {
    setExpected((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/expected-projects/${id}`, { method: "DELETE" });
  }

  // Participant CRUD
  async function saveParticipant(id: number, field: string, rawVal: string) {
    const value = rawVal.trim() || null;
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    await fetch(`/api/participants/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
  }
  async function addParticipant(role: string, name: string, company: string) {
    if (!name.trim()) return;
    const res = await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, name: name.trim(), company: company.trim() || null }) });
    const created = await res.json();
    setParticipants((prev) => [...prev, created]);
  }
  async function deleteParticipant(id: number) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/participants/${id}`, { method: "DELETE" });
  }

  // Derived
  const bidProjects = projects.filter((p) => p.category === "개찰").sort((a, b) => a.orderNum - b.orderNum);
  const ongoingProjects = projects.filter((p) => p.category === "진행중").sort((a, b) => a.orderNum - b.orderNum);
  const totalCost = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const chartData = [...projects].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    cost: p.cost ?? 0, category: p.category,
  }));

  const ROLE_ORDER = ["책임기술자", "건축", "토목", "안전", "기계"];
  const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
    책임기술자: { bg: "#fdf5f2", color: "#cc785c" },
    건축:       { bg: "#f0f9f7", color: "#5db8a6" },
    토목:       { bg: "#fef8ec", color: "#b87d2a" },
    안전:       { bg: "#fdf2ef", color: "#c04c3a" },
    기계:       { bg: "#f3f0eb", color: "#6c6a64" },
  };

  // Table header class
  const thCls = "px-3 py-2.5 text-xs font-medium uppercase tracking-widest border-b";

  // ProjectRow
  function ProjectRow({ p, i, isFirst, isLast }: { p: Project; i: number; isFirst: boolean; isLast: boolean }) {
    const rowBg = i % 2 === 0 ? "var(--canvas)" : "var(--surface-soft)";
    return (
      <tr className="border-b transition-colors"
        style={{ borderColor: "var(--hairline-soft)", background: rowBg }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-card)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
      >
        <td className="px-2 py-1"><EditableCell value={p.orderNum} onSave={(v) => saveProject(p.id, "orderNum", v)} type="number" align="center" /></td>
        <td className="px-2 py-1 font-medium" style={{ color: "var(--ink)" }}><EditableCell value={p.name} onSave={(v) => saveProject(p.id, "name", v)} placeholder="용역명 입력" /></td>
        <td className="px-2 py-1"><EditableCell value={p.leader} onSave={(v) => saveProject(p.id, "leader", v)} align="center" /></td>
        <td className="px-2 py-1"><EditableCell value={p.submitDate} onSave={(v) => saveProject(p.id, "submitDate", v)} align="center" /></td>
        <td className="px-2 py-1"><EditableCell value={p.presentDate} onSave={(v) => saveProject(p.id, "presentDate", v)} align="center" /></td>
        <td className="px-2 py-1"><EditableCell value={p.openDate} onSave={(v) => saveProject(p.id, "openDate", v)} align="center" /></td>
        <td className="px-2 py-1 font-semibold" style={{ color: "var(--primary)" }}><EditableCell value={p.cost} onSave={(v) => saveProject(p.id, "cost", v)} type="number" align="center" /></td>
        <td className="px-2 py-1" style={{ color: "var(--muted)" }}><EditableCell value={p.notes} onSave={(v) => saveProject(p.id, "notes", v)} /></td>
        <td className="px-1 py-1 text-center">
          <div className="flex flex-col items-center gap-0.5">
            <button onClick={() => moveProject(p.id, p.category, "up")} disabled={isFirst} title="위로"
              className="transition-colors disabled:opacity-20 disabled:cursor-default"
              style={{ color: "var(--muted-soft)" }}
              onMouseEnter={(e) => !isFirst && (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
            ><ChevronUp size={13} /></button>
            <button onClick={() => moveProject(p.id, p.category, "down")} disabled={isLast} title="아래로"
              className="transition-colors disabled:opacity-20 disabled:cursor-default"
              style={{ color: "var(--muted-soft)" }}
              onMouseEnter={(e) => !isLast && (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
            ><ChevronDown size={13} /></button>
          </div>
        </td>
        <td className="px-2 py-1 text-center">
          <button onClick={() => deleteProject(p.id)} className="transition-colors"
            style={{ color: "var(--hairline)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c04c3a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--hairline)")}
          ><Trash2 size={13} /></button>
        </td>
      </tr>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>

      {/* ── Header (dark surface) ── */}
      <header className="sticky top-0 z-10 px-6 py-0" style={{ background: "var(--surface-dark)", borderBottom: "1px solid var(--surface-dark-el)" }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap h-16">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            {/* Spike mark SVG */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0v16M0 8h16M2.34 2.34l11.32 11.32M13.66 2.34 2.34 13.66" stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <h1 className="font-display text-base" style={{ color: "var(--on-dark)", letterSpacing: "-0.02em" }}>
                미래사업팀 주간업무
              </h1>
              <p className="text-xs" style={{ color: "var(--on-dark-soft)" }}>{weekDisplayRange(currentWeek)}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Week navigator */}
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentWeek((w) => shiftWeek(w, -1))}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--on-dark-soft)", border: "1px solid var(--surface-dark-el)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-dark-el)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              ><ChevronLeft size={15} /></button>
              <span className="text-sm font-medium min-w-[90px] text-center select-none" style={{ color: "var(--on-dark)" }}>
                {currentWeek}
              </span>
              <button onClick={() => setCurrentWeek((w) => shiftWeek(w, 1))}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--on-dark-soft)", border: "1px solid var(--surface-dark-el)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-dark-el)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              ><ChevronRight size={15} /></button>
            </div>

            {/* Export button — coral CTA */}
            <button onClick={handleExport} disabled={exporting || projects.length === 0}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)", color: "#fff" }}
              onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = "var(--primary-active)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
            >
              <Download size={14} />
              {exporting ? "생성 중…" : "HWPX 내보내기"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">

        {/* Empty state banner */}
        {!loading && projects.length === 0 && (
          <div className="rounded-xl p-5 flex items-center justify-between gap-4 border"
            style={{ background: "#fdf5f2", borderColor: "#e8c4b4" }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--primary-active)" }}>
                {currentWeek} 주차에 데이터가 없습니다
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>
                아래 버튼으로 샘플 데이터를 불러오거나, 표에서 직접 행을 추가하세요.
              </p>
            </div>
            <button onClick={handleSeed} disabled={seeding}
              className="shrink-0 text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}>
              {seeding ? "초기화 중…" : "샘플 데이터 불러오기"}
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="개찰" value={`${bidProjects.length}건`} />
          <StatCard label="진행중" value={`${ongoingProjects.length}건`} />
          <StatCard label="총 용역비" value={`${totalCost.toFixed(1)}억원`} accent />
          <StatCard label="기준 주차" value={currentWeek} sub={weekDisplayRange(currentWeek)} />
        </div>

        {/* ── 수행 Project 표 ── */}
        <section>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>
            1) 수행 Project <span className="text-sm font-sans font-normal" style={{ color: "var(--muted)" }}>공동수행</span>
          </h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--hairline)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface-card)" }}>
                    <th className={`${thCls} w-8 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>No</th>
                    <th className={`${thCls} text-left min-w-[160px]`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>용역명</th>
                    <th className={`${thCls} w-16 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>단장</th>
                    <th className={`${thCls} w-14 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>제출일</th>
                    <th className={`${thCls} w-16 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>발표/면접</th>
                    <th className={`${thCls} w-14 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>개찰일</th>
                    <th className={`${thCls} w-16 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>용역비(억)</th>
                    <th className={`${thCls} min-w-[120px] text-left`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>내용</th>
                    <th className={`${thCls} w-8 text-center`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>순서</th>
                    <th className={`${thCls} w-8`} style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}></th>
                  </tr>
                </thead>

                {/* 개찰 */}
                <tbody>
                  <tr style={{ background: "#fdf5f2", borderBottom: "1px solid #f0d5c8" }}>
                    <td colSpan={10} className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--primary)" }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--primary)" }} />
                        개찰
                        <span className="font-normal" style={{ color: "var(--primary-active)", opacity: 0.7 }}>({bidProjects.length}건)</span>
                      </span>
                    </td>
                  </tr>
                  {bidProjects.map((p, i) => <ProjectRow key={p.id} p={p} i={i} isFirst={i === 0} isLast={i === bidProjects.length - 1} />)}
                  <tr style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
                    <td colSpan={10} className="px-3 py-1.5">
                      <button onClick={() => addProject("개찰")}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: "var(--muted-soft)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
                      ><Plus size={12} /> 개찰 행 추가</button>
                    </td>
                  </tr>
                </tbody>

                {/* 진행중 */}
                <tbody>
                  <tr style={{ background: "#f0f9f7", borderBottom: "1px solid #c8e8e2" }}>
                    <td colSpan={10} className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent-teal)" }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent-teal)" }} />
                        진행중
                        <span className="font-normal" style={{ color: "var(--accent-teal)", opacity: 0.7 }}>({ongoingProjects.length}건)</span>
                      </span>
                    </td>
                  </tr>
                  {ongoingProjects.map((p, i) => <ProjectRow key={p.id} p={p} i={i} isFirst={i === 0} isLast={i === ongoingProjects.length - 1} />)}
                  <tr>
                    <td colSpan={10} className="px-3 py-1.5">
                      <button onClick={() => addProject("진행중")}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: "var(--muted-soft)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-teal)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
                      ><Plus size={12} /> 진행중 행 추가</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 발주예상 표 ── */}
        <section>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>
            2) 발주예상 Project <span className="text-sm font-sans font-normal" style={{ color: "var(--muted)" }}>공동예정</span>
          </h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--hairline)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface-card)" }}>
                    {["No","Project명","발주청","단장","사업비(억)","발주(월)","용역비(억)","내용",""].map((h, i) => (
                      <th key={i} className={`${thCls} ${i === 1 ? "text-left min-w-[160px]" : i === 7 ? "text-left min-w-[120px]" : "text-center"} ${i === 0 ? "w-8" : i === 2 ? "w-24" : i === 3 ? "w-16" : ""}`}
                        style={{ color: "var(--muted)", borderColor: "var(--hairline)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expected.map((e, i) => {
                    const bg = i % 2 === 0 ? "var(--canvas)" : "var(--surface-soft)";
                    return (
                      <tr key={e.id} className="border-b transition-colors"
                        style={{ borderColor: "var(--hairline-soft)", background: bg }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--surface-card)")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = bg)}
                      >
                        <td className="px-2 py-1"><EditableCell value={e.orderNum} onSave={(v) => saveExpected(e.id, "orderNum", v)} type="number" align="center" /></td>
                        <td className="px-2 py-1 font-medium" style={{ color: "var(--ink)" }}><EditableCell value={e.name} onSave={(v) => saveExpected(e.id, "name", v)} placeholder="Project명 입력" /></td>
                        <td className="px-2 py-1"><EditableCell value={e.client} onSave={(v) => saveExpected(e.id, "client", v)} align="center" /></td>
                        <td className="px-2 py-1"><EditableCell value={e.leader} onSave={(v) => saveExpected(e.id, "leader", v)} align="center" /></td>
                        <td className="px-2 py-1 font-semibold" style={{ color: "var(--primary)" }}><EditableCell value={e.budget} onSave={(v) => saveExpected(e.id, "budget", v)} type="number" align="center" /></td>
                        <td className="px-2 py-1"><EditableCell value={e.planMonth} onSave={(v) => saveExpected(e.id, "planMonth", v)} align="center" /></td>
                        <td className="px-2 py-1 font-semibold" style={{ color: "var(--primary)" }}><EditableCell value={e.serviceCost} onSave={(v) => saveExpected(e.id, "serviceCost", v)} type="number" align="center" /></td>
                        <td className="px-2 py-1" style={{ color: "var(--muted)" }}><EditableCell value={e.notes} onSave={(v) => saveExpected(e.id, "notes", v)} /></td>
                        <td className="px-2 py-1 text-center">
                          <button onClick={() => deleteExpected(e.id)} className="transition-colors"
                            style={{ color: "var(--hairline)" }}
                            onMouseEnter={(ev) => (ev.currentTarget.style.color = "#c04c3a")}
                            onMouseLeave={(ev) => (ev.currentTarget.style.color = "var(--hairline)")}
                          ><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={9} className="px-3 py-1.5">
                      <button onClick={addExpected}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: "var(--muted-soft)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-soft)")}
                      ><Plus size={12} /> 행 추가</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 차트 (dark surface card) ── */}
        {chartData.filter((d) => d.cost > 0).length > 0 && (
          <section>
            <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>
              용역비 구성 <span className="text-sm font-sans font-normal" style={{ color: "var(--muted)" }}>억원</span>
            </h2>
            <div className="rounded-xl p-5" style={{ background: "var(--surface-dark)" }}>
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#a09d96" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#a09d96" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [`${v}억원`, "용역비"]}
                    contentStyle={{ fontSize: 12, background: "var(--surface-dark-el)", border: "1px solid #252320", borderRadius: 8, color: "var(--on-dark)" }}
                    itemStyle={{ color: "var(--on-dark-soft)" }}
                    labelStyle={{ color: "var(--on-dark)" }}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.category === "개찰" ? "#cc785c" : "#5db8a6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 justify-end mt-2">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--on-dark-soft)" }}>
                  <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "var(--primary)" }} />개찰
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--on-dark-soft)" }}>
                  <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "var(--accent-teal)" }} />진행중
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── 교육참가자 ── */}
        <section>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>
            3) 교육참가자 현황 <span className="text-sm font-sans font-normal" style={{ color: "var(--muted)" }}>OSG팀</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {ROLE_ORDER.map((role) => {
              const members = participants.filter((p) => p.role === role);
              const s = ROLE_STYLES[role];
              return (
                <div key={role} className="rounded-xl p-3 border" style={{ background: "var(--canvas)", borderColor: "var(--hairline)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: s.bg, color: s.color }}>{role}</span>
                    <span className="text-xs" style={{ color: "var(--muted-soft)" }}>{members.length}명</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {members.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs"
                        style={{ background: "var(--surface-card)", color: "var(--body-strong)" }}>
                        <EditableCell value={m.name} onSave={(v) => saveParticipant(m.id, "name", v)} placeholder="이름" />
                        {m.company && <span className="text-[10px]" style={{ color: "var(--muted-soft)" }}>({m.company})</span>}
                        <button onClick={() => deleteParticipant(m.id)} title="삭제"
                          className="ml-0.5 flex-shrink-0 transition-colors"
                          style={{ color: "var(--hairline)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#c04c3a")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--hairline)")}
                        ><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <ParticipantAddForm role={role} onAdd={addParticipant} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer spacer */}
        <div className="h-8" />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(250,249,245,0.7)" }}>
          <div className="text-sm animate-pulse" style={{ color: "var(--muted)" }}>불러오는 중...</div>
        </div>
      )}
    </div>
  );
}
