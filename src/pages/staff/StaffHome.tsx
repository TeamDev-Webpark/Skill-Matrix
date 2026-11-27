import { Can } from '../../components/Permission';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Award, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock, Lock, PlayCircle, RotateCcw, TrendingUp, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACTORS, bangkokYear, employeesForYear, LEVEL_LABELS, skillKeys, SKILL_WIS, sumSkills } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useTrainingRequests } from '../../data/trainingStore';
import { TRAINING_STATUS } from '../../data/trainingCore';
import { lmsActions, useLms } from '../../data/lmsStore';
import { activeEnrollment, bkkDate, courseAudience, expiringSoon, isExpired, isOverdue, lessonsDone, progressPercent, skillFit, skillKey } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';
import { Avatar } from '../../components/Avatar';
import { panelClass } from '../../components/Phase1Shared';
import { EnrollmentBadge, formatThaiDate, LevelChip, ProgressBar } from '../../components/lms/LmsShared';
import { Classroom } from './LmsStaffPages';

const me = ACTORS.staff.employeeId;
const LEVEL_BAR = ['bg-slate-300', 'bg-amber-400', 'bg-blue-500', 'bg-emerald-500'];
const primary = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-transform hover:bg-blue-700 active:scale-[0.98]';
const secondary = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50';

function Panel({ title, action, onAction, children, className = '' }: { title: string; action?: string; onAction?: () => void; children: ReactNode; className?: string }) {
  return <section className={`${panelClass} min-w-0 p-5 ${className}`}>
    <header className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">{title}</h2>
      {action && <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">{action}<ArrowRight size={13}/></button>}</header>
    {children}
  </section>;
}

export default function StaffHomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const skill = useSkillState(); const lms = useLms(); const training = useTrainingRequests();
  const [open, setOpen] = useState(''); const [error, setError] = useState('');
  if (open) return <Classroom enrollmentId={open} onBack={() => setOpen('')}/>;

  const employee = employeesForYear(skill, bangkokYear()).find(e => e.id === me);
  const keys = employee ? skillKeys(employee) : [];
  const total = employee ? sumSkills(employee) : 0; const max = keys.length * 3;
  const levels = [0, 1, 2, 3].map(level => keys.filter(k => (employee?.scores[k] ?? 0) === level).length);
  const requests = training.filter(r => r.employeeId === me);
  const openRequests = requests.filter(r => ['requested', 'scheduled', 'pending-manager'].includes(r.status));

  const courseOf = (e: Enrollment) => lms.courses.find(c => c.id === e.courseId);
  const mine = lms.enrollments.filter(e => e.employeeId === me).flatMap(e => { const c = courseOf(e); return c ? [{ e, c }] : []; });
  // ลำดับที่ควรทำก่อน: ส่งกลับ → เลยกำหนด → ใกล้กำหนด → เรียนไปแล้วมากกว่า
  const learning = mine.filter(({ e }) => e.status === 'in-progress' || e.status === 'returned')
    .sort((a, b) => Number(b.e.status === 'returned') - Number(a.e.status === 'returned') || Number(isOverdue(b.e)) - Number(isOverdue(a.e)) || (a.e.dueDate ?? '9999').localeCompare(b.e.dueDate ?? '9999') || progressPercent(b.c, b.e) - progressPercent(a.c, a.e));
  const certs = mine.filter(({ e }) => e.status === 'certified' && !isExpired(e));
  const next = learning[0];
  const readyForExam = (e: Enrollment, c: Course) => lessonsDone(c, e) >= c.lessons.length;
  const action = (e: Enrollment, c: Course) => readyForExam(e, c) ? 'ทำแบบทดสอบ' : lessonsDone(c, e) ? 'เรียนต่อ' : 'เริ่มเรียน';
  const active = (status: string) => ['requested', 'scheduled', 'pending-manager'].includes(status);
  // คำขอที่ยังดำเนินการอยู่ขึ้นก่อน แล้วจึงรายการล่าสุด
  const recentRequests = requests.slice().reverse().sort((a, b) => Number(active(b.status)) - Number(active(a.status))).slice(0, 3);
  const recommended = lms.courses.filter(c => courseAudience(c, ACTORS.staff.department) && !activeEnrollment(lms, me, c.id) && skillFit(c, employee?.scores[skillKey(c) ?? ''] ?? 0) === 'recommended').slice(0, 3);

  const todo: { key: string; icon: LucideIcon; tone: string; title: string; detail: string; page: string }[] = [
    ...mine.filter(({ e }) => e.status === 'locked').map(({ e, c }) => ({ key: e.id, icon: Lock, tone: 'bg-red-50 text-red-700', title: c.title, detail: 'ใช้สิทธิ์สอบครบแล้ว รอหัวหน้าปลดล็อก', page: 'staff-lms-learning' })),
    ...mine.filter(({ e }) => e.status === 'returned').map(({ e, c }) => ({ key: e.id, icon: RotateCcw, tone: 'bg-amber-50 text-amber-700', title: c.title, detail: e.chiefRemark ? `ให้ทบทวนใหม่: ${e.chiefRemark}` : 'ให้ทบทวนบทเรียนใหม่', page: 'staff-lms-learning' })),
    ...mine.filter(({ e }) => isOverdue(e)).map(({ e, c }) => ({ key: `due-${e.id}`, icon: Clock, tone: 'bg-red-50 text-red-700', title: c.title, detail: `เลยกำหนดเรียน ${formatThaiDate(e.dueDate)}`, page: 'staff-lms-learning' })),
    ...requests.filter(r => r.status === 'scheduled').map(r => ({ key: r.id, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700', title: `อบรม ${r.wiCode} · ประเภท ${r.skillType}`, detail: (r.scheduledDate ?? '') < bkkDate() ? `อบรมวันที่ ${formatThaiDate(r.scheduledDate)} แล้ว รอหัวหน้าบันทึกผล` : `นัดวันที่ ${formatThaiDate(r.scheduledDate)}`, page: 'staff-training-tracking' })),
    ...mine.filter(({ e }) => e.status === 'pending-chief').map(({ e, c }) => ({ key: e.id, icon: UserCheck, tone: 'bg-slate-100 text-slate-600', title: c.title, detail: 'สอบผ่านแล้ว รอหัวหน้ารับรอง', page: 'staff-lms-learning' })),
    ...mine.filter(({ e }) => isExpired(e) || expiringSoon(e)).map(({ e, c }) => ({ key: `exp-${e.id}`, icon: Award, tone: 'bg-amber-50 text-amber-700', title: c.title, detail: `ใบรับรอง${isExpired(e) ? 'หมดอายุแล้ว' : 'จะหมดอายุ'} ${formatThaiDate(e.expiryDate)}`, page: 'staff-lms-catalog' })),
  ];

  const stats = [
    { label: 'คะแนนสกิลของฉัน', value: total, suffix: `/ ${max}`, page: 'staff-my-skills' },
    { label: 'สกิลที่ทำได้เอง', value: levels[2] + levels[3], suffix: `/ ${keys.length}`, page: 'staff-my-skills' },
    { label: 'หลักสูตรที่ต้องเรียน', value: mine.filter(({ e }) => ['in-progress', 'returned', 'locked'].includes(e.status)).length, suffix: 'หลักสูตร', page: 'staff-lms-learning' },
    { label: 'ใบรับรองที่ใช้ได้', value: certs.length, suffix: 'ใบ', page: 'staff-lms-certificates' },
    { label: 'คำขออบรมที่ดำเนินการอยู่', value: openRequests.length, suffix: 'รายการ', page: 'staff-training-tracking' },
  ];

  function start(c: Course) { setError(''); try { setOpen(lmsActions.selfEnroll(c.id)); } catch (e) { setError((e as Error).message); } }

  return <div className="space-y-5">
    <Can id="hero"><section className="grid overflow-hidden rounded-xl bg-blue-900 text-white lg:grid-cols-12">
      <div className="flex items-center gap-4 p-6 lg:col-span-5">
        <Avatar src={employee?.avatarUrl} name={ACTORS.staff.name} size="lg" className="ring-2 ring-white/40"/>
        <div className="min-w-0"><h1 className="text-2xl font-bold">หน้าหลักของฉัน</h1><p className="mt-1 truncate text-sm text-blue-100">{ACTORS.staff.name} · {me}</p><p className="truncate text-sm text-blue-200">{employee?.position} · {ACTORS.staff.department}</p></div>
      </div>
      <div className="border-t border-white/10 bg-white/5 p-6 lg:col-span-7 lg:border-l lg:border-t-0">
        {next ? <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-xs text-blue-200">{next.e.status === 'returned' && !lessonsDone(next.c, next.e) ? 'หัวหน้าส่งกลับให้ทบทวน' : readyForExam(next.e, next.c) ? 'เรียนครบแล้ว เหลือทำแบบทดสอบ' : lessonsDone(next.c, next.e) ? 'เรียนต่อจากที่ค้างไว้' : 'หลักสูตรที่รอคุณเริ่มเรียน'}{next.e.dueDate ? ` · กำหนดเสร็จ ${formatThaiDate(next.e.dueDate)}` : ''}</p>
            <p className="mt-1 line-clamp-2 text-lg font-bold leading-snug">{next.c.title}</p>
            <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="ความคืบหน้า" aria-valuenow={progressPercent(next.c, next.e)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-white" style={{ width: `${progressPercent(next.c, next.e)}%` }}/></div><span className="text-xs tabular-nums text-blue-100">{lessonsDone(next.c, next.e)}/{next.c.lessons.length} บท</span></div>
          </div>
          <button type="button" onClick={() => setOpen(next.e.id)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-blue-900 transition-transform hover:bg-blue-50 active:scale-[0.98]"><PlayCircle size={17}/>{action(next.e, next.c)}</button>
        </div> : <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-lg font-bold">ไม่มีหลักสูตรค้างเรียน</p><p className="mt-1 text-sm text-blue-100">เลือกหลักสูตรใหม่จากคลังได้ทันที ไม่ต้องยื่นคำขอ</p></div><button type="button" onClick={() => onNavigate('staff-lms-catalog')} className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-50">ดูคลังหลักสูตร</button></div>}
      </div>
    </section></Can>

    <Can id="stats"><section className={`${panelClass} grid divide-y divide-slate-100 overflow-hidden sm:grid-cols-2 sm:divide-x xl:grid-cols-5 xl:divide-y-0`} aria-label="สรุปของฉัน">
      {stats.map(s => <button key={s.label} type="button" onClick={() => onNavigate(s.page)} className="p-4 text-left hover:bg-blue-50/50"><span className="block text-sm text-slate-500">{s.label}</span><span className="mt-1 block"><strong className="text-3xl font-bold tabular-nums text-slate-900">{s.value}</strong><span className="ml-1.5 text-sm text-slate-400">{s.suffix}</span></span></button>)}
    </section></Can>

    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="grid items-start gap-5 xl:grid-cols-12">
      <div className="space-y-5 xl:col-span-8">
        <Can id="learning"><Panel title="เรียนออนไลน์ของฉัน" action="ดูทั้งหมด" onAction={() => onNavigate('staff-lms-learning')}>
          {!learning.length ? <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">ยังไม่มีหลักสูตรที่กำลังเรียน</p> : <ul className="divide-y divide-slate-100">{learning.slice(0, 4).map(({ e, c }) => { const percent = progressPercent(c, e); return <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><BookOpen size={19} aria-hidden="true"/></span>
            <div className="min-w-0 flex-1 basis-56"><p className="truncate text-sm font-semibold text-slate-900" title={c.title}>{c.title}</p><p className="text-xs text-slate-500">{c.code} · {lessonsDone(c, e)}/{c.lessons.length} บท{e.dueDate ? <span className={isOverdue(e) ? 'font-semibold text-red-700' : ''}> · กำหนด {formatThaiDate(e.dueDate)}</span> : ''}</p></div>
            <div className="flex w-40 items-center gap-2"><div className="flex-1"><ProgressBar value={percent} label={`ความคืบหน้า ${c.title}`}/></div><span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">{percent}%</span></div>
            <button type="button" className={`${secondary} w-32`} aria-label={`${action(e, c)} ${c.title}`} onClick={() => setOpen(e.id)}>{action(e, c)}</button>
          </li>; })}</ul>}
        </Panel></Can>

        <Can id="recommended"><Panel title="แนะนำเพื่อเพิ่มระดับสกิล" action="ดูคลังหลักสูตร" onAction={() => onNavigate('staff-lms-catalog')}>
          {!recommended.length ? <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">ตอนนี้ยังไม่มีหลักสูตรใหม่ที่ตรงกับช่องว่างสกิลของคุณ</p> : <ul className="grid gap-3 md:grid-cols-3">{recommended.map(c => <li key={c.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
            <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900" title={c.title}>{c.title}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><LevelChip level={employee?.scores[skillKey(c) ?? ''] ?? 0}/><TrendingUp size={13} aria-hidden="true"/><LevelChip level={c.skillToLevel}/></p>
            <p className="truncate text-xs text-slate-500">{c.wiCode} · {c.skillType} {SKILL_WIS.find(w => w.code === c.wiCode)?.types.find(t => t.code === c.skillType)?.label}</p>
            <Can id="recommended" action="create"><button type="button" className={`${primary} mt-auto`} aria-label={`สมัครเรียน ${c.title}`} onClick={() => start(c)}>สมัครเรียน</button></Can>
          </li>)}</ul>}
        </Panel></Can>

        <Can id="training"><Panel title="การฝึกอบรมของฉัน" action="ติดตามคำขอ" onAction={() => onNavigate('staff-training-tracking')}>
          {!requests.length ? <p className="text-sm text-slate-500">ยังไม่มีคำขอฝึกอบรม</p> : <ul className="divide-y divide-slate-100">{recentRequests.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{r.wiCode} · ประเภท {r.skillType}</p><p className="text-xs text-slate-500">{r.scheduledDate ? `วันอบรม ${formatThaiDate(r.scheduledDate)}` : `เสนอวันที่ ${formatThaiDate(r.desiredDate)}`}</p></div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : ['failed', 'rejected-chief', 'rejected-manager'].includes(r.status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{TRAINING_STATUS[r.status]}</span>
          </li>)}</ul>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Can id="training" action="create"><button type="button" className={primary} onClick={() => onNavigate('staff-training-request')}><ClipboardList size={15}/>ยื่นขอฝึกอบรม</button></Can>
            <button type="button" className={secondary} onClick={() => onNavigate('staff-training-results')}>ดูผลฝึกอบรม</button>
          </div>
        </Panel></Can>
      </div>

      <div className="space-y-5 xl:col-span-4">
        <Can id="todo"><Panel title={`สิ่งที่ต้องติดตาม${todo.length ? ` (${todo.length})` : ''}`}>
          {!todo.length ? <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={17}/>ไม่มีรายการค้าง</p> : <ul className="space-y-1">{todo.slice(0, 5).map(t => <li key={t.key}><button type="button" onClick={() => onNavigate(t.page)} className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-slate-50">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tone}`}><t.icon size={16} aria-hidden="true"/></span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{t.title}</span><span className="line-clamp-2 text-xs leading-5 text-slate-500">{t.detail}</span></span>
          </button></li>)}</ul>}
          {todo.length > 5 && <p className="mt-2 text-xs text-slate-500">และอีก {todo.length - 5} รายการ</p>}
        </Panel></Can>

        <Can id="levels"><Panel title="ระดับสกิลของฉัน" action="พัฒนาการรายปี" onAction={() => onNavigate('staff-yearly')}>
          <p className="mb-3 text-xs text-slate-500">คะแนนที่ผู้จัดการยืนยันแล้ว {total} จาก {max} คะแนน ({max ? Math.round(total / max * 100) : 0}%)</p>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={levels.map((n, i) => `ระดับ ${i} ${n} สกิล`).join(' ')}>{levels.map((n, i) => n > 0 && <div key={i} className={LEVEL_BAR[i]} style={{ width: `${n / keys.length * 100}%` }}/>)}</div>
          <ul className="mt-3 divide-y divide-slate-100">{[3, 2, 1, 0].map(i => <li key={i} className="flex items-center justify-between py-2 text-sm"><span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-sm ${LEVEL_BAR[i]}`}/>Lv {i} · {LEVEL_LABELS[i]}</span><strong className="tabular-nums text-slate-900">{levels[i]}</strong></li>)}</ul>
        </Panel></Can>

        {certs.length > 0 && <Can id="certificates"><Panel title="ใบรับรองล่าสุด" action="ดูทั้งหมด" onAction={() => onNavigate('staff-lms-certificates')}>
          <ul className="space-y-3">{certs.slice().sort((a, b) => (b.e.certifiedAt ?? '').localeCompare(a.e.certifiedAt ?? '')).slice(0, 3).map(({ e, c }) => <li key={e.id} className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award size={18} aria-hidden="true"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800" title={c.title}>{c.title}</p><p className="text-xs text-slate-500">รับรอง {formatThaiDate(e.certifiedAt)}</p></div><EnrollmentBadge e={e}/></li>)}</ul>
        </Panel></Can>}
      </div>
    </div>
  </div>;
}
