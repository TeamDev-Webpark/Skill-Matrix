import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock, Database, FileText, GraduationCap, Lock, ShieldCheck, Users, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACTORS, bangkokYear, employeesForYear, SKILL_DEPARTMENTS, SKILL_WIS, visibleEmployees } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useTrainingRequests } from '../../data/trainingStore';
import { TRAINING_STATUS } from '../../data/trainingCore';
import { useLms } from '../../data/lmsStore';
import { isOverdue } from '../../data/lmsCore';
import { Can, useCanVisit } from '../../components/Permission';
import { panelClass } from '../../components/Phase1Shared';
import { formatThaiDate, formatThaiDateTime } from '../../components/lms/LmsShared';

function Panel({ title, note, action, onAction, children }: { title: string; note?: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return <section className={`${panelClass} flex min-w-0 flex-col p-5`}>
    <header className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{title}</h2>{note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}</div>
      {action && onAction && <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">{action}<ArrowRight size={13}/></button>}</header>
    <div className="flex-1">{children}</div>
  </section>;
}

/** แท่งแนวนอนพร้อมตัวเลขกำกับ */
function Bars({ items }: { items: { label: string; value: number; note?: string; color?: string }[] }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return <ul className="space-y-3">{items.map(i => <li key={i.label}>
    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-700">{i.label}</span><span className="shrink-0 tabular-nums"><strong className="text-slate-900">{i.value}</strong>{i.note && <span className="ml-2 text-xs text-slate-500">{i.note}</span>}</span></div>
    <div className="h-2 rounded bg-slate-100"><div className={`h-full rounded ${i.color ?? 'bg-blue-600'}`} style={{ width: `${i.value / max * 100}%` }}/></div>
  </li>)}</ul>;
}

export default function AdminHome({ onNavigate }: { onNavigate: (page: string) => void }) {
  const skill = useSkillState(); const training = useTrainingRequests(); const lms = useLms(); const canVisit = useCanVisit();
  const people = employeesForYear(skill, bangkokYear());
  const reports = new Set(visibleEmployees(people, 'chief').map(e => e.id));
  const types = SKILL_WIS.reduce((n, w) => n + w.types.length, 0);
  const published = lms.courses.filter(c => c.status === 'published').length;
  const drafts = lms.courses.filter(c => c.status === 'draft').length;
  const pendingAdjust = skill.adjustments.filter(a => a.status === 'pending').length;
  const openTraining = training.filter(r => ['requested', 'scheduled', 'pending-manager'].includes(r.status)).length;
  const go = (page: string) => canVisit(page) ? () => onNavigate(page) : undefined;

  const attention: { icon: LucideIcon; tone: string; count: number; title: string; detail: string; page: string }[] = [
    { icon: Lock, tone: 'bg-red-50 text-red-700', count: lms.enrollments.filter(e => e.status === 'locked').length, title: 'ผู้เรียนติดล็อกสิทธิ์สอบ', detail: 'ตรวจและปลดล็อกให้เรียนต่อได้', page: 'admin-lms-enrollments' },
    { icon: Clock, tone: 'bg-red-50 text-red-700', count: lms.enrollments.filter(e => isOverdue(e)).length, title: 'การเรียนเลยกำหนด', detail: 'ติดตามหรือแก้กำหนดเรียน', page: 'admin-lms-enrollments' },
    { icon: UserX, tone: 'bg-amber-50 text-amber-700', count: lms.enrollments.filter(e => e.status === 'pending-chief' && !reports.has(e.employeeId)).length, title: 'ผลเรียนที่ยังไม่มีหัวหน้ารับรอง', detail: 'ผู้เรียนไม่ได้อยู่ใต้หัวหน้าในระบบสาธิต', page: 'admin-lms-enrollments' },
    { icon: FileText, tone: 'bg-amber-50 text-amber-700', count: drafts, title: 'หลักสูตรฉบับร่าง', detail: 'ตรวจเนื้อหาแล้วเผยแพร่', page: 'admin-lms-courses' },
    { icon: Users, tone: 'bg-blue-50 text-blue-700', count: people.filter(p => !p.assignedSkills.length).length, title: 'พนักงานยังไม่ได้รับมอบหมายสกิล', detail: 'กำหนดงานที่รับผิดชอบให้ครบ', page: 'admin-employees' },
  ];
  const todo = attention.filter(a => a.count > 0);

  const stats: { label: string; value: number; note: string; icon: LucideIcon; page: string }[] = [
    { label: 'พนักงานในระบบ', value: people.length, note: `${new Set(people.map(p => p.department)).size} แผนก`, icon: Users, page: 'admin-employees' },
    { label: 'มาตรฐานงาน W/I', value: SKILL_WIS.length, note: `${types} สกิลย่อย`, icon: Database, page: 'admin-master-data' },
    { label: 'หลักสูตรที่เผยแพร่', value: published, note: `ฉบับร่าง ${drafts}`, icon: BookOpen, page: 'admin-lms-courses' },
    { label: 'การลงทะเบียนเรียน', value: lms.enrollments.length, note: `รับรองแล้ว ${lms.enrollments.filter(e => e.status === 'certified').length}`, icon: GraduationCap, page: 'admin-lms-reports' },
    { label: 'รายการฝึกอบรม', value: training.length, note: `กำลังดำเนินการ ${openTraining}`, icon: CheckCircle2, page: 'admin-training-audit' },
  ];

  const departments = SKILL_DEPARTMENTS.map(d => ({ label: d, value: people.filter(p => p.department === d).length, note: `${SKILL_WIS.filter(w => w.department === d).length} W/I` }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const learning = [
    { label: 'รับรองแล้ว', value: lms.enrollments.filter(e => e.status === 'certified').length, color: 'bg-emerald-500' },
    { label: 'กำลังเรียน', value: lms.enrollments.filter(e => e.status === 'in-progress' || e.status === 'returned').length, color: 'bg-blue-500' },
    { label: 'รอหัวหน้ารับรอง', value: lms.enrollments.filter(e => e.status === 'pending-chief').length, color: 'bg-amber-400' },
    { label: 'ติดล็อก', value: lms.enrollments.filter(e => e.status === 'locked').length, color: 'bg-red-500' },
  ];

  // ความเคลื่อนไหวล่าสุดจากทั้งสามระบบ
  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? id;
  const activity = [
    ...skill.adjustments.map(a => ({ key: a.id, at: a.reviewedAt ?? a.submittedAt, area: 'คะแนนสกิล', text: `${a.status === 'pending' ? 'เสนอปรับคะแนน' : a.status === 'approved' ? 'อนุมัติการปรับคะแนน' : 'ไม่อนุมัติการปรับคะแนน'} · ${nameOf(a.employeeId)}`, by: a.reviewedName ?? a.submittedName })),
    ...training.map(r => ({ key: r.id, at: r.managerReviewedAt ?? r.evaluatedAt ?? r.chiefReviewedAt ?? r.submittedAt, area: 'ฝึกอบรม', text: `${TRAINING_STATUS[r.status]} · ${r.employeeName} (${r.wiCode})`, by: r.managerName ?? r.chiefName ?? r.employeeName })),
    ...lms.enrollments.flatMap(e => { const last = e.events.at(-1); return last ? [{ key: e.id, at: last.at, area: 'เรียนออนไลน์', text: `${last.action} · ${e.employeeName}`, by: last.actor }] : []; }),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);

  const shortcuts: { title: string; detail: string; icon: LucideIcon; page: string }[] = [
    { title: 'จัดการข้อมูลพนักงาน', detail: 'เพิ่ม แก้ไข โอนย้าย และนำเข้าจาก Excel', icon: Users, page: 'admin-employees' },
    { title: 'จัดการข้อมูลพื้นฐาน', detail: 'W/I และประเภทสกิล', icon: Database, page: 'admin-master-data' },
    { title: 'จัดการหลักสูตร', detail: 'สร้างบทเรียนและแบบทดสอบ', icon: BookOpen, page: 'admin-lms-courses' },
    { title: 'มอบหมายผู้เรียน', detail: 'มอบหมายหลักสูตรและติดตาม', icon: GraduationCap, page: 'admin-lms-enrollments' },
    { title: 'สิทธิ์และบทบาท', detail: 'กำหนดการมองเห็นรายหน้า', icon: ShieldCheck, page: 'admin-permissions' },
    { title: 'รายงานข้อมูลสกิล', detail: 'ความสามารถตามงาน', icon: FileText, page: 'admin-reports' },
  ].filter(s => canVisit(s.page));

  return <div className="space-y-5">
    <Can id="header"><section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-blue-900 p-6 text-white">
      <div><h1 className="text-2xl font-bold">ภาพรวมการดูแลระบบ</h1><p className="mt-1 text-sm text-blue-100">{ACTORS.admin.name} · ข้อมูล ณ {formatThaiDate(new Date().toISOString())}</p></div>
      <p className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm">{todo.length ? <><AlertTriangle size={17} className="text-amber-300"/>มี {todo.length} เรื่องที่ควรตรวจ</> : <><CheckCircle2 size={17} className="text-emerald-300"/>ไม่มีเรื่องค้างตรวจ</>}{pendingAdjust > 0 && <span className="border-l border-white/20 pl-2 text-blue-100">คำขอปรับคะแนนรอ Manager {pendingAdjust}</span>}</p>
    </section></Can>

    <Can id="metrics"><section className={`${panelClass} grid divide-y divide-slate-100 overflow-hidden sm:grid-cols-2 sm:divide-x xl:grid-cols-5 xl:divide-y-0`} aria-label="ตัวเลขสรุปของระบบ">
      {stats.map(s => <button key={s.label} type="button" disabled={!canVisit(s.page)} onClick={go(s.page)} className="p-4 text-left enabled:hover:bg-blue-50/50">
        <span className="flex items-center gap-2 text-sm text-slate-500"><s.icon size={16} className="text-blue-600" aria-hidden="true"/>{s.label}</span>
        <span className="mt-1.5 block text-3xl font-bold tabular-nums text-slate-900">{s.value}</span>
        <span className="block text-xs text-slate-500">{s.note}</span></button>)}
    </section></Can>

    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-5"><Can id="attention"><Panel title="เรื่องที่ควรตรวจ" note="เรียงตามผลกระทบต่อผู้ใช้งาน">
        {!todo.length ? <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={17}/>ทุกอย่างเรียบร้อย</p> : <ul className="divide-y divide-slate-100">{todo.map(a => <li key={a.title}>
          <button type="button" disabled={!canVisit(a.page)} onClick={go(a.page)} className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left enabled:hover:bg-slate-50">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.tone}`}><a.icon size={18} aria-hidden="true"/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{a.title}</span><span className="block text-xs text-slate-500">{a.detail}</span></span>
            <strong className="text-xl tabular-nums text-slate-900">{a.count}</strong>
            {canVisit(a.page) && <ArrowRight size={15} className="text-slate-400" aria-hidden="true"/>}
          </button></li>)}</ul>}
      </Panel></Can></div>
      <div className="xl:col-span-4"><Can id="departments"><Panel title="พนักงานแยกตามแผนก" action={canVisit('admin-employees') ? 'จัดการ' : undefined} onAction={go('admin-employees')}><Bars items={departments}/></Panel></Can></div>
      <div className="xl:col-span-3"><Can id="learning"><Panel title="สถานะการเรียนออนไลน์" action={canVisit('admin-lms-reports') ? 'รายงาน' : undefined} onAction={go('admin-lms-reports')}><Bars items={learning}/></Panel></Can></div>
    </div>

    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-7"><Can id="activity"><Panel title="ความเคลื่อนไหวล่าสุด" note="คะแนนสกิล การฝึกอบรม และการเรียนออนไลน์">
        {!activity.length ? <p className="text-sm text-slate-500">ยังไม่มีรายการ</p> : <ol className="divide-y divide-slate-100">{activity.map(a => <li key={`${a.area}-${a.key}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
          <span className={`w-24 shrink-0 rounded-md px-2 py-1 text-center text-[11px] font-semibold ${a.area === 'คะแนนสกิล' ? 'bg-blue-50 text-blue-700' : a.area === 'ฝึกอบรม' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{a.area}</span>
          <span className="min-w-0 flex-1 basis-56 truncate text-sm text-slate-800" title={a.text}>{a.text}</span>
          <span className="text-xs text-slate-500">{a.by} · {formatThaiDateTime(a.at)}</span>
        </li>)}</ol>}
      </Panel></Can></div>
      <div className="xl:col-span-5"><Can id="shortcuts"><Panel title="ทางลัด">
        <ul className="grid gap-2 sm:grid-cols-2">{shortcuts.map(s => <li key={s.page}><button type="button" onClick={() => onNavigate(s.page)} className="flex h-full w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><s.icon size={17} aria-hidden="true"/></span>
          <span><span className="block text-sm font-semibold text-slate-800">{s.title}</span><span className="block text-xs leading-5 text-slate-500">{s.detail}</span></span></button></li>)}</ul>
      </Panel></Can></div>
    </div>
  </div>;
}
