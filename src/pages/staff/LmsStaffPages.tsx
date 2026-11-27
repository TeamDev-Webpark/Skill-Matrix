import { Can } from '../../components/Permission';
import { Paged } from '../../components/Paged';
import { useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { ACTORS, bangkokYear, employeesForYear, SKILL_WIS } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useLms, lmsActions } from '../../data/lmsStore';
import { activeEnrollment, attemptsUsed, courseAudience, expiringSoon, isExpired, isOverdue, prerequisitesMet, progressPercent, skillFit, skillKey } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';
import { buttonClass, EmptyState, inputClass, Metric } from '../../components/Phase1Shared';
import { RolePageIntro } from '../../components/RolePageIntro';
import CatalogCard from '../../components/lms/CatalogCard';
import LmsClassroom from '../../components/lms/LmsClassroom';
import { practicalItem } from '../../data/lmsPractical';
import LmsCertificate from '../../components/lms/LmsCertificate';
import { EnrollmentBadge, LevelChip, Pill, ProgressBar, formatThaiDate, useSkillLevel } from '../../components/lms/LmsShared';

const me = ACTORS.staff.employeeId;
const SKILL_TYPES = ['A', 'B', 'C', 'D', 'E'];
/** สถานะการลงเรียนของฉันในแต่ละหลักสูตร (ใบรับรองหมดอายุแล้วนับเป็นยังไม่เรียน) */
type Progress = 'all' | 'learning' | 'new' | 'done';
const PROGRESS: [Progress, string][] = [['all', 'ทุกสถานะ'], ['learning', 'กำลังเรียน'], ['new', 'ยังไม่ได้เรียน'], ['done', 'รับรองผลแล้ว']];
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

function ClassroomWithLevel({ course, enrollment, onBack }: { course: Course; enrollment: Enrollment; onBack: () => void }) {
  const level = useSkillLevel(me, course); const lms = useLms(); const skill = useSkillState();
  return <LmsClassroom course={course} enrollment={enrollment} onBack={onBack} currentLevel={level} skillStage={practicalItem(lms, skill, enrollment)?.stage}
    onLessonDone={(lessonId, info) => lmsActions.completeLesson(enrollment.id, lessonId, info)}
    onSubmitExam={answers => lmsActions.submitExam(enrollment.id, answers)}/>;
}
export function Classroom({ enrollmentId, onBack }: { enrollmentId: string; onBack: () => void }) {
  const lms = useLms();
  const enrollment = lms.enrollments.find(e => e.id === enrollmentId);
  const course = lms.courses.find(c => c.id === enrollment?.courseId);
  if (!enrollment || !course) return <EmptyState>ไม่พบการลงทะเบียนนี้</EmptyState>;
  return <ClassroomWithLevel course={course} enrollment={enrollment} onBack={onBack}/>;
}
/** ระดับปัจจุบันของ Staff ทุกสกิล เพื่อแนะนำหลักสูตรตามช่องว่างทักษะ */
function useMyScores() {
  const state = useSkillState();
  return employeesForYear(state, bangkokYear()).find(e => e.id === me)?.scores ?? {};
}

function EnrollmentCard({ e, c, onOpen }: { e: Enrollment; c: Course; onOpen: () => void }) {
  const certified = e.status === 'certified'; const pct = progressPercent(c, e);
  return <article className={`${card} flex flex-col gap-4 p-5 transition-shadow hover:shadow-md`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-slate-500">{c.code} · {c.category}{c.mandatory && <span className="ml-2 font-semibold text-amber-700">หลักสูตรบังคับ</span>}</p><h2 className="mt-0.5 text-lg font-bold leading-snug text-slate-900">{c.title}</h2></div><EnrollmentBadge e={e}/></div>
    {c.skillToLevel > 0 && <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">สกิล {c.wiCode} · {c.skillType}</span><LevelChip level={c.skillFromLevel}/>→<LevelChip level={c.skillToLevel}/></p>}
    <div><div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>ความคืบหน้า</span><span className="font-semibold text-slate-700">{pct}%</span></div><ProgressBar value={pct}/></div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500"><div>กำหนดเสร็จ <span className={isOverdue(e) ? 'font-semibold text-red-700' : 'text-slate-700'}>{formatThaiDate(e.dueDate)}</span></div><div>สอบแล้ว <span className="text-slate-700">{attemptsUsed(e)}/{c.maxAttempts} ครั้ง</span></div>{e.assignedBy && <div className="col-span-2">มอบหมายโดย {e.assignedBy}</div>}{certified && <div className="col-span-2">ใบรับรอง {e.certificateNo} · {e.expiryDate ? `หมดอายุ ${formatThaiDate(e.expiryDate)}` : 'ไม่หมดอายุ'}</div>}</dl>
    <Can id="list" action="edit"><button className={`${buttonClass} mt-auto self-start`} onClick={onOpen}>{certified ? 'ดูใบรับรอง' : e.status === 'pending-chief' || e.status === 'locked' ? 'ดูสถานะ' : pct > 0 ? 'เรียนต่อ' : 'เริ่มเรียน'}</button></Can>
  </article>;
}

export function StaffLmsLearningPage() {
  const lms = useLms(); const [open, setOpen] = useState('');
  if (open) return <Classroom enrollmentId={open} onBack={() => setOpen('')}/>;
  const mine = lms.enrollments.filter(e => e.employeeId === me && e.status !== 'certified' && !isExpired(e));
  const done = lms.enrollments.filter(e => e.employeeId === me && e.status === 'certified');
  const todo = mine.filter(e => ['in-progress', 'returned', 'locked'].includes(e.status));
  return <div className="space-y-6">
    <Can id="header"><RolePageIntro title="การเรียนของฉัน" description="เรียนจากหลักสูตรออนไลน์ได้ทันที ไม่ต้องยื่นขออบรม · เมื่อสอบผ่านหัวหน้างานจะรับรองผลให้" steps={['เลือกหลักสูตรและเรียนให้ครบทุกบท','ทำแบบทดสอบท้ายหลักสูตร','หัวหน้ารับรองผลและออกใบรับรอง']}/></Can>
    <Can id="metrics"><div className="grid gap-4 md:grid-cols-4"><Metric label="กำลังเรียน" value={todo.length}/><Metric label="รอหัวหน้ารับรอง" value={mine.filter(e => e.status === 'pending-chief').length}/><Metric label="รับรองแล้ว" value={done.length}/><Metric label="เลยกำหนด" value={mine.filter(e => isOverdue(e)).length}/></div></Can>
    {mine.length === 0 ? <EmptyState>ยังไม่มีหลักสูตรที่กำลังเรียน ไปที่เมนู คลังหลักสูตร เพื่อเลือกเรียนได้เลย</EmptyState>
      : <Can id="list"><Paged items={mine} size={6} sizes={[6, 12, 24]} boxed unit="หลักสูตร">{({ rows, bar }) => <><div className="grid gap-4 xl:grid-cols-2">{rows.map(e => { const c = lms.courses.find(x => x.id === e.courseId); return c && <EnrollmentCard key={e.id} e={e} c={c} onOpen={() => setOpen(e.id)}/>; })}</div>{bar}</>}</Paged></Can>}
  </div>;
}

export function StaffLmsCatalogPage() {
  const lms = useLms(); const scores = useMyScores();
  const [open, setOpen] = useState(''); const [query, setQuery] = useState(''); const [category, setCategory] = useState('ALL'); const [mode, setMode] = useState<'all' | 'skill' | 'mandatory'>('all'); const [error, setError] = useState('');
  const [wi, setWi] = useState('ALL'); const [type, setType] = useState('ALL'); const [progress, setProgress] = useState<Progress>('all');
  if (open) return <Classroom enrollmentId={open} onBack={() => setOpen('')}/>;
  const audience = lms.courses.filter(c => courseAudience(c, ACTORS.staff.department));
  const fit = (c: Course) => skillFit(c, scores[skillKey(c) ?? ''] ?? 0);
  const recommended = audience.filter(c => fit(c) === 'recommended' && !activeEnrollment(lms, me, c.id)?.certifiedAt);
  const progressOf = (c: Course): Progress => { const e = activeEnrollment(lms, me, c.id); return !e ? 'new' : e.status === 'certified' ? 'done' : 'learning'; };
  const list = audience.filter(c => (category === 'ALL' || c.category === category) && (mode === 'all' || (mode === 'skill' ? c.skillToLevel > 0 : c.mandatory)) && (wi === 'ALL' || c.wiCode === wi) && (type === 'ALL' || c.skillType === type) && (progress === 'all' || progressOf(c) === progress) && `${c.code} ${c.title} ${c.description} ${c.wiCode ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(fit(b) === 'recommended') - Number(fit(a) === 'recommended') || a.code.localeCompare(b.code));
  const categories = [...new Set(audience.map(c => c.category))];
  // ตัวเลือก W/I: งานของแผนกตัวเอง รวมงานที่มีหลักสูตรผูกอยู่ พร้อมจำนวนหลักสูตร
  const wiOptions = SKILL_WIS.filter(w => w.department === ACTORS.staff.department || audience.some(c => c.wiCode === w.code))
    .map(w => ({ code: w.code, name: w.name.replace(/\s*\(.*\)$/, ''), count: audience.filter(c => c.wiCode === w.code).length }));
  const typeCount = (code: string) => audience.filter(c => c.skillType === code && (wi === 'ALL' || c.wiCode === wi)).length;
  const filtered = !!query || category !== 'ALL' || mode !== 'all' || wi !== 'ALL' || type !== 'ALL' || progress !== 'all';
  function reset() { setQuery(''); setCategory('ALL'); setMode('all'); setWi('ALL'); setType('ALL'); setProgress('all'); }
  function start(c: Course) { setError(''); try { const ex = activeEnrollment(lms, me, c.id); setOpen(ex ? ex.id : lmsActions.selfEnroll(c.id)); } catch (e) { setError((e as Error).message); } }
  const chip = (id: typeof mode, label: string) => <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${mode === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>;
  return <div className="space-y-6">
    <Can id="header"><RolePageIntro title="คลังหลักสูตร" description="หลักสูตรที่เปิดให้แผนกของคุณ · เลือกตามสกิลที่อยากเพิ่มระดับ แล้วสมัครเรียนได้ทันที"/></Can>
    <Can id="status"><div className="flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="สถานะการลงเรียน">{PROGRESS.map(([id, label]) => { const count = id === 'all' ? audience.length : audience.filter(c => progressOf(c) === id).length;
      return <button key={id} type="button" role="tab" aria-selected={progress === id} onClick={() => setProgress(id)} className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${progress === id ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}<span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${progress === id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span></button>; })}</div></Can>
    {recommended.length > 0 && <Can id="recommended"><section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5" aria-label="หลักสูตรแนะนำ"><h2 className="flex items-center gap-2 font-bold text-blue-900"><Sparkles size={18}/>แนะนำเพื่อเพิ่มระดับสกิลของคุณ</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">{recommended.map(c => <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-100"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{c.title}</p><p className="mt-1 flex items-center gap-2 text-xs text-slate-500">{c.wiCode} · {c.skillType}<LevelChip level={scores[skillKey(c) ?? ''] ?? 0}/>→<LevelChip level={c.skillToLevel}/></p></div><Can id="recommended" action="create"><button className={buttonClass} onClick={() => start(c)}>เริ่มเรียน</button></Can></li>)}</ul></section></Can>}
    <Can id="filters"><div className="flex flex-wrap items-center gap-3"><div className="flex gap-2" role="group" aria-label="มุมมอง">{chip('all', 'ทั้งหมด')}{chip('skill', 'เพื่อเพิ่มระดับสกิล')}{chip('mandatory', 'หลักสูตรบังคับ')}</div>
      <input aria-label="ค้นหาหลักสูตร" placeholder="ค้นหาชื่อหรือรหัสหลักสูตร" className={`${inputClass} max-w-xs`} value={query} onChange={e => setQuery(e.target.value)}/>
      <select aria-label="หมวดหมู่" className={`${inputClass} max-w-48`} value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">ทุกหมวดหมู่</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></Can>
    <Can id="filters"><div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <select aria-label="Work Instruction" className={`${inputClass} max-w-md`} value={wi} onChange={e => { setWi(e.target.value); setType('ALL'); }}><option value="ALL">ทุก Work Instruction</option>{wiOptions.map(w => <option key={w.code} value={w.code}>{w.code} · {w.name} ({w.count})</option>)}</select>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="ประเภทสกิล"><span className="mr-1 text-sm text-slate-600">ประเภทสกิล</span>
        {['ALL', ...SKILL_TYPES].map(code => { const count = code === 'ALL' ? 0 : typeCount(code); const active = type === code;
          return <button key={code} type="button" aria-pressed={active} disabled={code !== 'ALL' && !count && !active} onClick={() => setType(code)} title={code === 'ALL' ? 'ทุกประเภท' : `ประเภท ${code} · ${count} หลักสูตร`}
            className={`inline-flex h-9 min-w-9 items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {code === 'ALL' ? 'ทั้งหมด' : code}{count > 0 && <span className={`ml-1 text-xs font-normal ${active ? 'text-blue-100' : 'text-slate-400'}`}>{count}</span>}</button>; })}</div>
      <p className="text-xs text-slate-500" role="status">พบ {list.length} จาก {audience.length} หลักสูตร</p>
      {filtered && <button type="button" onClick={reset} className="text-sm font-semibold text-blue-700 hover:underline">ล้างตัวกรอง</button>}
    </div></Can>
    <Can id="list"><p className="text-xs text-slate-500">หลักสูตรที่ผูกกับสกิล: สอบผ่านและ Chief รับรองแล้ว ต้องผ่านประเมินหน้างานก่อน จึงเสนอปรับระดับให้ Manager ยืนยัน</p></Can>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {list.length === 0 ? <EmptyState>ไม่พบหลักสูตรที่ตรงกับเงื่อนไข</EmptyState>
      : <Can id="list"><Paged items={list} size={6} sizes={[6, 12, 24]} boxed unit="หลักสูตร" resetKey={`${query}|${category}|${mode}|${wi}|${type}|${progress}`}>{({ rows, bar }) => <><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{rows.map(c => <CatalogCard key={c.id} course={c}
        enrollment={activeEnrollment(lms, me, c.id)} current={scores[skillKey(c) ?? ''] ?? 0}
        blockedBy={prerequisitesMet(lms, c, me) ? [] : c.prerequisiteIds.flatMap(id => lms.courses.find(x => x.id === id)?.title ?? [])}
        onStart={() => start(c)}/>)}</div>{bar}</>}</Paged></Can>}
  </div>;
}

export function StaffLmsCertificatesPage() {
  const lms = useLms(); const [open, setOpen] = useState('');
  const certs = lms.enrollments.filter(e => e.employeeId === me && e.status === 'certified').sort((a, b) => (b.certifiedAt ?? '').localeCompare(a.certifiedAt ?? ''));
  const sel = certs.find(e => e.id === open); const selCourse = lms.courses.find(c => c.id === sel?.courseId);
  return <div className="space-y-6">
    <div className="print:hidden"><Can id="header"><RolePageIntro title="ใบรับรองของฉัน" description="ใบรับรองผลการเรียนที่หัวหน้างานรับรองแล้ว · พิมพ์หรือบันทึกเป็น PDF ได้"/></Can></div>
    {sel && selCourse ? <><button className="text-sm text-blue-700 hover:underline print:hidden" onClick={() => setOpen('')}>← กลับรายการใบรับรอง</button><LmsCertificate course={selCourse} enrollment={sel}/></>
      : certs.length === 0 ? <EmptyState>ยังไม่มีใบรับรอง เมื่อสอบผ่านและหัวหน้ารับรองผลแล้วจะแสดงที่นี่</EmptyState>
      : <Can id="list"><Paged items={certs} size={6} sizes={[6, 12, 24]} boxed unit="ใบ">{({ rows, bar }) => <><div className="grid gap-4 xl:grid-cols-2">{rows.map(e => { const c = lms.courses.find(x => x.id === e.courseId); return <article key={e.id} className={`${card} flex items-center gap-4 p-5`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500"><Award size={26}/></span><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{c?.title}</h2><p className="text-xs text-slate-500">{e.certificateNo} · รับรอง {formatThaiDate(e.certifiedAt)}</p><div className="mt-1.5">{isExpired(e) ? <Pill tone="red">หมดอายุ {formatThaiDate(e.expiryDate)}</Pill> : expiringSoon(e) ? <Pill tone="amber">ใกล้หมดอายุ {formatThaiDate(e.expiryDate)}</Pill> : <Pill tone="green">{e.expiryDate ? `ใช้ได้ถึง ${formatThaiDate(e.expiryDate)}` : 'ไม่หมดอายุ'}</Pill>}</div></div><button className={buttonClass} onClick={() => setOpen(e.id)}>เปิดใบรับรอง</button></article>; })}</div>{bar}</>}</Paged></Can>}
  </div>;
}
