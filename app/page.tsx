"use client";

import { useEffect, useRef, useState } from "react";

interface Project {
  id: number;
  category: string;
  orderNum: number;
  name: string;
  leader: string;
  submitDate: string | null;
  presentDate: string | null;
  openDate: string | null;
  cost: number | null;
  notes: string | null;
}

interface Participant {
  id: number;
  name: string;
  role: string;
  company: string | null;
}

type ProjectForm = Omit<Project, "id">;
type ParticipantForm = Omit<Participant, "id">;

const EMPTY_PROJECT: ProjectForm = {
  category: "진행중", orderNum: 1, name: "", leader: "",
  submitDate: "", presentDate: "", openDate: "", cost: null, notes: "",
};
const EMPTY_PARTICIPANT: ParticipantForm = { name: "", role: "책임기술자", company: "" };

const ROLE_ORDER = ["책임기술자", "건축", "토목", "안전", "기계"];
const ROLE_COLORS: Record<string, string> = {
  책임기술자: "bg-blue-100 text-blue-800",
  건축: "bg-emerald-100 text-emerald-800",
  토목: "bg-amber-100 text-amber-800",
  안전: "bg-red-100 text-red-800",
  기계: "bg-purple-100 text-purple-800",
};

/* ─── 모달 ─────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── 삭제 확인 모달 ────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title="삭제 확인" onClose={onClose}>
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">취소</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">삭제</button>
      </div>
    </Modal>
  );
}

/* ─── 프로젝트 폼 ───────────────────────────────────── */
function ProjectFormModal({
  initial, onSave, onClose,
}: {
  initial: ProjectForm & { id?: number };
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectForm>(initial);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ProjectForm, v: string) =>
    setForm((f) => ({ ...f, [k]: k === "cost" ? (v === "" ? null : Number(v)) : k === "orderNum" ? Number(v) : v }));

  const submit = async () => {
    if (!form.name || !form.leader) return alert("용역명과 단장은 필수입니다.");
    setSaving(true);
    const url = initial.id ? `/api/projects/${initial.id}` : "/api/projects";
    await fetch(url, { method: initial.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <Modal title={initial.id ? "프로젝트 수정" : "프로젝트 추가"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">구분 <span className="text-red-500">*</span></span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="진행중">진행중</option>
            <option value="개찰">개찰</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">순번</span>
          <input type="number" value={form.orderNum} onChange={(e) => set("orderNum", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">용역비 (억원)</span>
          <input type="number" step="0.1" value={form.cost ?? ""} onChange={(e) => set("cost", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">용역명 <span className="text-red-500">*</span></span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">단장 <span className="text-red-500">*</span></span>
          <input value={form.leader} onChange={(e) => set("leader", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">제출일</span>
          <input value={form.submitDate ?? ""} onChange={(e) => set("submitDate", e.target.value)} placeholder="예: 2/25"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">발표/면접</span>
          <input value={form.presentDate ?? ""} onChange={(e) => set("presentDate", e.target.value)} placeholder="예: 3/5"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">개찰일</span>
          <input value={form.openDate ?? ""} onChange={(e) => set("openDate", e.target.value)} placeholder="예: 3/10"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">내용</span>
          <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">취소</button>
        <button onClick={submit} disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium disabled:opacity-50">
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── 참가자 폼 ─────────────────────────────────────── */
function ParticipantFormModal({
  initial, onSave, onClose,
}: {
  initial: ParticipantForm & { id?: number };
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ParticipantForm>(initial);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ParticipantForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) return alert("이름은 필수입니다.");
    setSaving(true);
    const url = initial.id ? `/api/participants/${initial.id}` : "/api/participants";
    await fetch(url, { method: initial.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <Modal title={initial.id ? "참가자 수정" : "참가자 추가"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">이름 <span className="text-red-500">*</span></span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">역할</span>
          <select value={form.role} onChange={(e) => set("role", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {ROLE_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">소속 회사 (외부인 경우)</span>
          <input value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} placeholder="예: ITM, KD"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">취소</button>
        <button onClick={submit} disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium disabled:opacity-50">
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── 메인 대시보드 ─────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${color}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-sm mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<"전체" | "개찰" | "진행중">("전체");

  // 모달 상태
  const [projectModal, setProjectModal] = useState<(ProjectForm & { id?: number }) | null>(null);
  const [participantModal, setParticipantModal] = useState<(ParticipantForm & { id?: number }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "project" | "participant"; id: number; label: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, ptRes] = await Promise.all([fetch("/api/projects"), fetch("/api/participants")]);
    setProjects(await pRes.json());
    setParticipants(await ptRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const seed = async () => {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await fetchData();
    setSeeding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const url = deleteTarget.type === "project" ? `/api/projects/${deleteTarget.id}` : `/api/participants/${deleteTarget.id}`;
    await fetch(url, { method: "DELETE" });
    setDeleteTarget(null);
    fetchData();
  };

  const totalCost = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const filtered = filter === "전체" ? projects : projects.filter((p) => p.category === filter);
  const grouped = ROLE_ORDER.reduce<Record<string, Participant[]>>((acc, role) => {
    acc[role] = participants.filter((p) => p.role === role);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-lg">데이터 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      {/* 모달들 */}
      {projectModal && (
        <ProjectFormModal
          initial={projectModal}
          onSave={fetchData}
          onClose={() => setProjectModal(null)}
        />
      )}
      {participantModal && (
        <ParticipantFormModal
          initial={participantModal}
          onSave={fetchData}
          onClose={() => setParticipantModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`"${deleteTarget.label}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div className="space-y-8">
        {projects.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">데이터가 없습니다</p>
              <p className="text-amber-600 text-sm mt-1">HWPX 파일 기반 샘플 데이터를 불러오려면 초기화 버튼을 클릭하세요.</p>
            </div>
            <button onClick={seed} disabled={seeding}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
              {seeding ? "초기화 중..." : "샘플 데이터 초기화"}
            </button>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="전체 프로젝트" value={projects.length} sub="건" color="bg-white border-slate-200 text-slate-800" />
          <StatCard label="개찰" value={projects.filter((p) => p.category === "개찰").length} sub="건" color="bg-white border-slate-200 text-slate-800" />
          <StatCard label="진행중" value={projects.filter((p) => p.category === "진행중").length} sub="건" color="bg-white border-blue-200 text-blue-900" />
          <StatCard
            label="총 용역비"
            value={`${totalCost.toFixed(1)}억`}
            sub={`평균 ${(totalCost / (projects.length || 1)).toFixed(1)}억`}
            color="bg-white border-emerald-200 text-emerald-900"
          />
        </div>

        {/* 수행 프로젝트 테이블 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">1) 수행 Project (공동수행)</h2>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(["전체", "개찰", "진행중"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      filter === f ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setProjectModal({ ...EMPTY_PROJECT, orderNum: (projects.length ? Math.max(...projects.map((p) => p.orderNum)) + 1 : 1) })}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                + 추가
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="px-3 py-3 text-center font-semibold w-16">구분</th>
                    <th className="px-3 py-3 text-center font-semibold w-8">No</th>
                    <th className="px-3 py-3 text-left font-semibold">용역명</th>
                    <th className="px-3 py-3 text-center font-semibold w-20">단장</th>
                    <th className="px-3 py-3 text-center font-semibold w-16">제출일</th>
                    <th className="px-3 py-3 text-center font-semibold w-20">발표/면접</th>
                    <th className="px-3 py-3 text-center font-semibold w-16">개찰일</th>
                    <th className="px-3 py-3 text-center font-semibold w-20">용역비(억)</th>
                    <th className="px-3 py-3 text-left font-semibold">내용</th>
                    <th className="px-3 py-3 text-center font-semibold w-20">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 transition-colors`}>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.category === "개찰" ? "bg-sky-100 text-sky-700" : "bg-green-100 text-green-700"
                        }`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{p.orderNum}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{p.name}</td>
                      <td className="px-3 py-2.5 text-center">{p.leader}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{p.submitDate || "-"}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{p.presentDate || "-"}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{p.openDate || "-"}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{p.cost != null ? `${p.cost}억` : "-"}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs">{p.notes}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setProjectModal({ id: p.id, category: p.category, orderNum: p.orderNum, name: p.name, leader: p.leader, submitDate: p.submitDate, presentDate: p.presentDate, openDate: p.openDate, cost: p.cost, notes: p.notes })}
                            className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 font-medium transition-colors">
                            수정
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "project", id: p.id, label: p.name })}
                            className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 font-medium transition-colors">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-slate-400">데이터가 없습니다</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 교육 참가자 현황 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">3) 교육 참가자 현황 (OSG팀)</h2>
            <button
              onClick={() => setParticipantModal({ ...EMPTY_PARTICIPANT })}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              + 추가
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_ORDER.map((role) => {
              const members = grouped[role] ?? [];
              return (
                <div key={role} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[role]}`}>{role}</span>
                    <span className="text-slate-400 text-sm">{members.length}명</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <div key={m.id} className="group relative flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-sm">
                        <span>
                          {m.name}
                          {m.company && <span className="text-slate-400 text-xs ml-1">({m.company})</span>}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => setParticipantModal({ id: m.id, name: m.name, role: m.role, company: m.company })}
                            className="text-blue-500 hover:text-blue-700 text-xs px-1 font-bold leading-none">✎</button>
                          <button
                            onClick={() => setDeleteTarget({ type: "participant", id: m.id, label: m.name })}
                            className="text-red-400 hover:text-red-600 text-xs px-1 font-bold leading-none">×</button>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && <span className="text-slate-300 text-sm">-</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 리셋 버튼 */}
        {projects.length > 0 && (
          <div className="flex justify-end">
            <button onClick={seed} disabled={seeding}
              className="text-slate-400 hover:text-slate-600 text-sm underline transition-colors">
              {seeding ? "초기화 중..." : "데이터 재초기화"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
