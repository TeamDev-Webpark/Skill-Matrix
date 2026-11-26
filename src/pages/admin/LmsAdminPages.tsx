import { Paged } from '../../components/Paged';
import { useState } from 'react';
import { Copy, Download, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ACTORS, SKILL_DEPARTMENTS, bangkokYear, employeesForYear } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useLms, lmsActions } from '../../data/lmsStore';
import * as core from '../../data/lmsCore';
import type { Course, LmsState } from '../../data/lmsCore';
import { downloadCsv } from '../../lib/phase1Export';
import { buttonClass, EmptyState, Field, inputClass, Metric, panelClass } from '../../components/Phase1Shared';
import { RolePageIntro } from '../../components/RolePageIntro';
import CourseEditor from '../../components/lms/CourseEditor';
import LearnerTable from '../../components/lms/LearnerTable';
import LmsClassroom from '../../components/lms/LmsClassroom';
import { CourseStatusBadge, formatThaiDate, Pill } from '../../components/lms/LmsShared';

const ghost = 'inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50';

/** ทดลองเรียนแบบชั่วคราว: ไม่เขียนลงระบบจริง */
function Preview({ course, onClose }: { course: Course; onClose: () => void }) {
  const [state, setState] = useState<LmsState>(() => {
    const c: Course = { ...course, status: 'published', prerequisiteIds: [] };
    const learner = { id: 'PREVIEW', name: 'ผู้ทดลองเรียน', department: c.department === 'ALL' ? 'QC Section' : c.department };
    return core.enroll({ courses: [c], enrollments: [] }, learner, c.id, { role: 'staff', name: learner.name });
  });
  const enrollment = state.enrollments[0];
  return <LmsClassroom preview course={state.courses[0]} enrollment={enrollment} onBack={onClose}
    onLessonDone={(lessonId, info) => setState(s => core.completeLesson(s, enrollment.id, lessonId, info))}
    onSubmitExam={answers => { const r = core.submitExam(state, enrollment.id, answers); setState(r.state); return r.attempt; }}/>;
}

export function AdminLmsCoursesPage() {
  const lms = useLms();
  const [editing, setEditing] = useState<{ course: Course; isNew: boolean } | null>(null);
  const [preview, setPreview] = useState<Course | null>(null);
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('ALL'); const [category, setCategory] = useState('ALL');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const run = (action: () => void, ok: string) => { setError(''); setMessage(''); try { action(); setMessage(ok); } catch (e) { setError((e as Error).message); } };

  if (preview) return <Preview course={preview} onClose={() => setPreview(null)}/>;
  if (editing) return <CourseEditor key={editing.course.id} initial={editing.course} courses={lms.courses} isNew={editing.isNew} onClose={() => setEditing(null)} onPreview={setPreview}
    onSave={(c, publish) => { lmsActions.saveCourse(c, publish); setEditing(null); setMessage(publish ? 'เผยแพร่หลักสูตรแล้ว' : 'บันทึกหลักสูตรแล้ว'); }}/>;

  const list = lms.courses.filter(c => (status === 'ALL' || c.status === status) && (category === 'ALL' || c.category === category) && `${c.code} ${c.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><RolePageIntro title="จัดการหลักสูตรเรียนออนไลน์" description="สร้าง แก้ไข เผยแพร่ และเก็บถาวรหลักสูตร พร้อมบทเรียน วิดีโอ จุดคำถาม และคลังข้อสอบ"/>
      <button className={buttonClass} onClick={() => setEditing({ course: core.emptyCourse(), isNew: true })}><Plus size={16}/>สร้างหลักสูตร</button></div>
    <div className="grid gap-4 md:grid-cols-4"><Metric label="หลักสูตรทั้งหมด" value={lms.courses.length}/><Metric label="เผยแพร่แล้ว" value={lms.courses.filter(c => c.status === 'published').length}/><Metric label="ฉบับร่าง" value={lms.courses.filter(c => c.status === 'draft').length}/><Metric label="เก็บถาวร" value={lms.courses.filter(c => c.status === 'archived').length}/></div>
    <div className="flex flex-wrap gap-3"><input aria-label="ค้นหาหลักสูตร" className={`${inputClass} max-w-sm`} placeholder="ค้นหารหัสหรือชื่อหลักสูตร" value={query} onChange={e => setQuery(e.target.value)}/>
      <select aria-label="สถานะ" className={`${inputClass} max-w-48`} value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">ทุกสถานะ</option>{Object.entries(core.COURSE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select aria-label="หมวดหมู่" className={`${inputClass} max-w-56`} value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">ทุกหมวดหมู่</option>{core.COURSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {list.length === 0 ? <EmptyState>ไม่พบหลักสูตร</EmptyState> : <Paged items={list} size={5} boxed unit="หลักสูตร" resetKey={`${query}|${status}|${category}`}>{({ rows, bar }) => <div className="space-y-3">{rows.map(c => { const s = core.courseStats(lms, c.id); return <article key={c.id} className={`${panelClass} space-y-3 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{c.code} · {c.category} · {c.department === 'ALL' ? 'ทุกแผนก' : c.department} · เวอร์ชัน {c.version}</p><h2 className="font-bold text-slate-800">{c.title}</h2></div><div className="flex items-center gap-2">{c.mandatory && <Pill tone="amber">บังคับ</Pill>}<CourseStatusBadge c={c}/></div></div>
      <p className="text-xs text-slate-500">{c.lessons.length} บทเรียน · {c.lessons.reduce((n, l) => n + l.durationMin, 0)} นาที · {c.questions.length} ข้อสอบ · ผ่าน {c.passScore}% · สอบ {c.maxAttempts} ครั้ง · ผู้เรียน {s.enrolled} คน · รับรองแล้ว {s.certified} คน</p>
      <div className="flex flex-wrap gap-2">
        <button className={ghost} onClick={() => setEditing({ course: structuredClone(c), isNew: false })}><Pencil size={13}/>แก้ไข</button>
        <button className={ghost} disabled={!c.lessons.length} onClick={() => setPreview(c)}><Eye size={13}/>ทดลองเรียน</button>
        <button className={ghost} onClick={() => run(() => lmsActions.duplicateCourse(c.id), 'ทำสำเนาเป็นฉบับร่างแล้ว')}><Copy size={13}/>ทำสำเนา</button>
        {c.status !== 'published' && <button className={ghost} onClick={() => run(() => lmsActions.setCourseStatus(c.id, 'published'), 'เผยแพร่หลักสูตรแล้ว')}>เผยแพร่</button>}
        {c.status === 'published' && <button className={ghost} onClick={() => run(() => lmsActions.setCourseStatus(c.id, 'draft'), 'ถอนกลับเป็นฉบับร่างแล้ว ผู้ที่กำลังเรียนยังเรียนต่อได้')}>ถอนเป็นฉบับร่าง</button>}
        {c.status !== 'archived' && <button className={ghost} onClick={() => run(() => lmsActions.setCourseStatus(c.id, 'archived'), 'เก็บถาวรแล้ว')}>เก็บถาวร</button>}
        <button className={`${ghost} text-red-700`} onClick={() => { if (window.confirm(`ลบหลักสูตร "${c.title}"? การลบย้อนกลับไม่ได้`)) run(() => lmsActions.deleteCourse(c.id), 'ลบหลักสูตรแล้ว'); }}><Trash2 size={13}/>ลบ</button></div></article>; })}{bar}</div>}</Paged>}
  </div>;
}

export function AdminLmsEnrollmentsPage() {
  const lms = useLms(); const skill = useSkillState();
  const people = employeesForYear(skill, bangkokYear()).filter(e => e.id !== ACTORS.manager.employeeId);
  const [courseId, setCourseId] = useState(''); const [dept, setDept] = useState('ALL'); const [picked, setPicked] = useState<string[]>([]); const [due, setDue] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [fCourse, setFCourse] = useState('ALL'); const [fDept, setFDept] = useState('ALL'); const [fStatus, setFStatus] = useState('ALL');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const published = lms.courses.filter(c => c.status === 'published');
  const selectedCourse = published.find(c => c.id === courseId);
  const target = selectedCourse ? people.filter(p => (dept === 'ALL' || p.department === dept)
    && core.courseAudience(selectedCourse, p.department)
    && !core.activeEnrollment(lms, p.id, selectedCourse.id)
    && core.prerequisitesMet(lms, selectedCourse, p.id)) : [];
  const search = employeeQuery.trim().toLocaleLowerCase('th');
  const shownPeople = target.filter(p => `${p.name} ${p.id}`.toLocaleLowerCase('th').includes(search));
  const selectedPeople = target.filter(p => picked.includes(p.id));
  const allShownPicked = shownPeople.length > 0 && shownPeople.every(p => picked.includes(p.id));
  const rows = lms.enrollments.filter(e => (fCourse === 'ALL' || e.courseId === fCourse) && (fDept === 'ALL' || e.department === fDept) && (fStatus === 'ALL' || e.status === fStatus || (fStatus === 'overdue' && core.isOverdue(e)))).slice().reverse();
  const run = (action: () => void, ok: string) => { setError(''); setMessage(''); try { action(); setMessage(ok); } catch (e) { setError((e as Error).message); } };
  function assign(ev: React.FormEvent) {
    ev.preventDefault();
    setError(''); setMessage('');
    try {
      if (!selectedCourse) throw new Error('เลือกหลักสูตร');
      if (!selectedPeople.length) throw new Error('เลือกพนักงานอย่างน้อย 1 คน');
      const skipped = lmsActions.assign(selectedCourse.id, 'admin', selectedPeople.map(p => ({ id: p.id, name: p.name, department: p.department })), due || undefined);
      setPicked([]);
      setMessage(`มอบหมายหลักสูตรแล้ว ${selectedPeople.length - skipped.length} คน${skipped.length ? ` · ข้าม ${skipped.length} คน (${skipped.join('; ')})` : ''}`);
    } catch (e) { setError((e as Error).message); }
  }
  return <div className="space-y-6">
    <RolePageIntro title="มอบหมายและติดตามผู้เรียน" description="มอบหมายหลักสูตรให้รายบุคคลหรือทั้งแผนก ตั้งกำหนดเสร็จ ติดตามสถานะ และปลดล็อกสิทธิ์สอบ"/>
    <form onSubmit={assign} className={`${panelClass} space-y-4 p-5`}><h2 className="font-bold text-slate-800">มอบหมายหลักสูตร</h2>
      <div className="grid gap-4 md:grid-cols-3"><Field label="หลักสูตร (เฉพาะที่เผยแพร่แล้ว)"><select className={inputClass} value={courseId} onChange={e => { setCourseId(e.target.value); setPicked([]); setEmployeeQuery(''); setError(''); setMessage(''); }}><option value="">เลือกหลักสูตร</option>{published.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></Field>
        <Field label="แผนก"><select className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`} disabled={!selectedCourse} value={dept} onChange={e => { setDept(e.target.value); setPicked([]); }}><option value="ALL">ทุกแผนก</option>{SKILL_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="กำหนดเรียนให้เสร็จ (ไม่บังคับ)"><input type="date" min={core.bkkDate()} className={inputClass} value={due} onChange={e => setDue(e.target.value)}/></Field></div>
      {!selectedCourse ? <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-6 text-center text-sm text-slate-500">เลือกหลักสูตรก่อน เพื่อแสดงพนักงานที่พร้อมรับมอบหมาย</p> :
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-700">เลือกพนักงานที่ยังไม่ได้ลงทะเบียน</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400"/><input type="search" aria-label="ค้นหาพนักงานเพื่อมอบหมาย" className={`${inputClass} pl-9`} placeholder="ค้นหาชื่อหรือรหัสพนักงาน" value={employeeQuery} onChange={e => setEmployeeQuery(e.target.value)}/></div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span aria-live="polite" className="font-semibold text-blue-700">เลือกแล้ว {selectedPeople.length} คน</span>
              {selectedPeople.length > 0 && <button type="button" className="text-slate-500 hover:text-slate-800 hover:underline" onClick={() => setPicked([])}>ล้างที่เลือกทั้งหมด</button>}
              <button type="button" disabled={shownPeople.length === 0} className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPicked(current => allShownPicked ? current.filter(id => !shownPeople.some(p => p.id === id)) : [...new Set([...current, ...shownPeople.map(p => p.id)])])}>{allShownPicked ? 'ยกเลิกที่แสดง' : 'เลือกทั้งหมดที่แสดง'}</button>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">แสดง {shownPeople.length} จาก {target.length} คนที่พร้อมรับมอบหมายตามแผนกและเงื่อนไขหลักสูตร · รายการที่เลือกจะคงอยู่ระหว่างค้นหา</p>
          {shownPeople.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{target.length === 0 ? 'ไม่มีพนักงานที่พร้อมรับมอบหมายในแผนกและหลักสูตรนี้' : 'ไม่พบพนักงานที่ตรงกับคำค้น ลองค้นหาด้วยชื่อหรือรหัสอื่น'}</p> :
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">{shownPeople.map(t => <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${picked.includes(t.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/50'}`}><input type="checkbox" aria-label={`เลือก ${t.name} (${t.id})`} className="mt-1 h-4 w-4 shrink-0" checked={picked.includes(t.id)} onChange={() => setPicked(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])}/><span className="min-w-0"><span className="block break-words font-medium text-slate-700">{t.name}</span><span className="mt-1 block text-xs text-slate-500">{t.id} · {t.department}</span></span></label>)}</div>}
        </fieldset>}
      <button disabled={!selectedCourse || selectedPeople.length === 0} className={buttonClass}>มอบหมายหลักสูตร{selectedPeople.length > 0 && ` (${selectedPeople.length} คน)`}</button></form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <section className={`${panelClass} space-y-4 p-5`}><h2 className="font-bold text-slate-800">รายการผู้เรียน ({rows.length})</h2>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]"><select aria-label="กรองหลักสูตร" className={inputClass} value={fCourse} onChange={e => setFCourse(e.target.value)}><option value="ALL">ทุกหลักสูตร</option>{lms.courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select>
        <select aria-label="กรองแผนก" className={inputClass} value={fDept} onChange={e => setFDept(e.target.value)}><option value="ALL">ทุกแผนก</option>{SKILL_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select>
        <select aria-label="กรองสถานะ" className={inputClass} value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="ALL">ทุกสถานะ</option><option value="overdue">เลยกำหนด</option>{Object.entries(core.ENROLLMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      {rows.length === 0 ? <p className="text-sm text-slate-500">ไม่พบรายการ</p> : <LearnerTable showDepartment resetKey={`${fCourse}|${fDept}|${fStatus}`} rows={rows} courses={lms.courses}
        onUnlock={(id, note) => { let ok = false; run(() => { lmsActions.unlock('admin', id, note); ok = true; }, 'ปลดล็อกสิทธิ์สอบแล้ว'); return ok; }}
        onRemove={e => { if (window.confirm(`ยกเลิกการลงทะเบียนของ ${e.employeeName}? ประวัติการเรียนของรายการนี้จะถูกลบ`)) run(() => lmsActions.removeEnrollment(e.id), 'ยกเลิกการลงทะเบียนแล้ว'); }}/>}</section>
  </div>;
}
export function AdminLmsReportsPage() {
  const lms = useLms(); const today = core.bkkDate();
  const rows = lms.enrollments; const certified = rows.filter(e => e.status === 'certified');
  const attempts = rows.flatMap(e => e.attempts);
  const courseRows = lms.courses.filter(c => c.status !== 'draft' || rows.some(e => e.courseId === c.id)).map(c => ({ c, s: core.courseStats(lms, c.id, today) }));
  const deptRows = SKILL_DEPARTMENTS.map(d => { const r = rows.filter(e => e.department === d); const done = r.filter(e => e.status === 'certified').length; return { d, total: r.length, done, overdue: r.filter(e => core.isOverdue(e, today)).length, rate: r.length ? Math.round(done / r.length * 100) : 0 }; });
  const expiring = rows.filter(e => core.expiringSoon(e, 60, today) || core.isExpired(e, today));
  function exportCsv() {
    downloadCsv(`lms-report-${today}.csv`, [['พนักงาน', 'รหัส', 'แผนก', 'หลักสูตร', 'รหัสหลักสูตร', 'สถานะ', 'กำหนดเสร็จ', 'เลยกำหนด', 'ครั้งที่สอบ', 'คะแนนสูงสุด', 'เลขที่ใบรับรอง', 'วันที่รับรอง', 'วันหมดอายุ'],
      ...rows.map(e => { const c = lms.courses.find(x => x.id === e.courseId); return [e.employeeName, e.employeeId, e.department, c?.title ?? '', c?.code ?? '', core.isExpired(e, today) ? 'ใบรับรองหมดอายุ' : core.ENROLLMENT_STATUS[e.status], e.dueDate ?? '', core.isOverdue(e, today) ? 'ใช่' : '', e.attempts.length, e.attempts.length ? Math.max(...e.attempts.map(a => a.score)) : '', e.certificateNo ?? '', e.certifiedAt?.slice(0, 10) ?? '', e.expiryDate ?? '']; })]);
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><RolePageIntro title="รายงานการเรียนออนไลน์" description="ภาพรวมการเรียน ผลสอบ และใบรับรอง แยกตามหลักสูตรและแผนก"/><button className={buttonClass} onClick={exportCsv} disabled={!rows.length}><Download size={16}/>ส่งออก CSV</button></div>
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Metric label="หลักสูตรเผยแพร่" value={lms.courses.filter(c => c.status === 'published').length}/><Metric label="รายการเรียนทั้งหมด" value={rows.length}/><Metric label="อัตรารับรองผล" value={`${rows.length ? Math.round(certified.length / rows.length * 100) : 0}%`}/><Metric label="อัตราสอบผ่านต่อครั้ง" value={`${attempts.length ? Math.round(attempts.filter(a => a.passed).length / attempts.length * 100) : 0}%`}/><Metric label="เลยกำหนด" value={rows.filter(e => core.isOverdue(e, today)).length}/><Metric label="รอหัวหน้ารับรอง" value={rows.filter(e => e.status === 'pending-chief').length}/></div>
    <section className={`${panelClass} p-5`}><h2 className="mb-3 font-bold text-slate-800">แยกตามหลักสูตร</h2><Paged items={courseRows} unit="หลักสูตร">{({ rows: shown, bar }) => <><div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-2">หลักสูตร</th><th>ผู้เรียน</th><th>รับรองแล้ว</th><th>รอรับรอง</th><th>เลยกำหนด</th><th>ติดล็อก</th><th>คะแนนเฉลี่ย</th><th>ผ่านต่อครั้ง</th></tr></thead><tbody>{shown.map(({ c, s }) => <tr key={c.id} className="border-t border-blue-50"><td className="py-2">{c.code} · {c.title}</td><td>{s.enrolled}</td><td>{s.certified} ({s.completionRate}%)</td><td>{s.pending}</td><td className={s.overdue ? 'font-semibold text-red-700' : ''}>{s.overdue}</td><td>{s.locked}</td><td>{s.avgScore || '-'}</td><td>{s.passRate ? `${s.passRate}%` : '-'}</td></tr>)}</tbody></table></div>{bar}</>}</Paged></section>
    <section className={`${panelClass} p-5`}><h2 className="mb-3 font-bold text-slate-800">แยกตามแผนก</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-2">แผนก</th><th>รายการเรียน</th><th>รับรองแล้ว</th><th>อัตรา</th><th>เลยกำหนด</th></tr></thead><tbody>{deptRows.map(r => <tr key={r.d} className="border-t border-blue-50"><td className="py-2">{r.d}</td><td>{r.total}</td><td>{r.done}</td><td>{r.total ? `${r.rate}%` : '-'}</td><td className={r.overdue ? 'font-semibold text-red-700' : ''}>{r.overdue}</td></tr>)}</tbody></table></div></section>
    <section className={`${panelClass} p-5`}><h2 className="mb-3 font-bold text-slate-800">ใบรับรองหมดอายุหรือใกล้หมดอายุ (60 วัน)</h2>
      {expiring.length === 0 ? <p className="text-sm text-slate-500">ไม่มีรายการ</p> : <Paged items={expiring}>{({ rows: shown, bar }) => <><ul className="divide-y divide-blue-50 text-sm">{shown.map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{e.employeeName} · {lms.courses.find(c => c.id === e.courseId)?.title}</span><span className="flex items-center gap-2">{core.isExpired(e, today) ? <Pill tone="red">หมดอายุ</Pill> : <Pill tone="amber">ใกล้หมดอายุ</Pill>}{formatThaiDate(e.expiryDate)}</span></li>)}</ul>{bar}</>}</Paged>}</section>
  </div>;
}
