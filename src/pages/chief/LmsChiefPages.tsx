import { Can } from '../../components/Permission';
import { Paged } from '../../components/Paged';
import { useState } from 'react';
import { ACTORS } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useLms, lmsActions, chiefTeam } from '../../data/lmsStore';
import { LEVEL_LABELS } from '../../data/phase1Core';
import { bkkDate, courseAudience, isOverdue, lessonsDone, skillKey } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';
import { buttonClass, EmptyState, Field, inputClass, Metric, panelClass } from '../../components/Phase1Shared';
import { RolePageIntro } from '../../components/RolePageIntro';
import LearnerTable from '../../components/lms/LearnerTable';
import { EnrollmentBadge, EventTimeline, formatThaiDate, formatThaiDateTime, LevelChip, useSkillLevel } from '../../components/lms/LmsShared';

/** รหัสลูกทีมตรง: ทุกหน้าของ Chief ใน LMS ใช้ขอบเขตนี้ */
function useTeam() { const team = chiefTeam(useSkillState()); return { team, isMine: (employeeId: string) => team.some(t => t.id === employeeId) }; }

function CertifyCard({ e, c, onResult }: { e: Enrollment; c: Course; onResult: (message: string) => void }) {
  const [remark, setRemark] = useState(''); const [error, setError] = useState(''); const [showLog, setShowLog] = useState(false);
  const level = useSkillLevel(e.employeeId, c); const key = skillKey(c);
  const attempts = e.attempts.slice(e.attemptsResetAt); const passed = attempts.find(a => a.passed);
  function decide(approve: boolean) { setError(''); try { lmsActions.certify(e.id, approve, remark); onResult(approve ? `รับรองผลของ ${e.employeeName} และออกใบรับรองแล้ว${c.skillToLevel > 0 && key ? ' · ขั้นต่อไป: ประเมินหน้างานที่เมนู “ประเมินหน้างานหลังเรียน”' : ''}` : `ส่ง ${e.employeeName} กลับให้ทบทวนแล้ว`); } catch (x) { setError((x as Error).message); } }
  const linked = !!key && c.skillToLevel > 0;
  const reached = linked && (level ?? 0) >= c.skillToLevel;
  // การ์ดทุกใบมี 6 แถวเท่ากันและใช้ subgrid ร่วมกับการ์ดข้างๆ หัวข้อแต่ละส่วนจึงอยู่ระดับเดียวกันเสมอ
  return <article className={`${panelClass} row-span-6 grid grid-rows-subgrid gap-y-4 p-5`}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-800">{e.employeeName}</h2><p className="text-xs text-slate-500">{e.employeeId} · {e.department}</p></div><div className="text-right text-xs text-slate-500">ส่งผลเมื่อ {e.passedAt ? formatThaiDateTime(e.passedAt) : '-'}</div></header>
    <div className="rounded-lg bg-blue-50 p-3"><p className="font-semibold text-blue-900">{c.title}</p><p className="text-xs text-blue-800">{c.code} · เวอร์ชันที่เรียน {e.courseVersion} · {c.category}</p></div>
    <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">{([['คะแนนสอบที่ผ่าน', `${passed?.score ?? '-'}%`, 'text-emerald-700'], ['เกณฑ์ผ่าน', `${c.passScore}%`, 'text-slate-700'], ['ครั้งที่สอบ', `${attempts.length}/${c.maxAttempts}`, 'text-slate-700'], ['เรียนครบ', `${lessonsDone(c, e)}/${c.lessons.length} บท`, 'text-slate-700']] as const).map(([label, value, tone]) => <div key={label} className="rounded-lg border border-slate-200 px-2 py-3"><dt className="text-xs text-slate-500">{label}</dt><dd className={`mt-1 text-xl font-bold ${tone}`}>{value}</dd></div>)}</dl>
    <div className="rounded-lg border border-slate-200 p-3 text-sm">{linked
      ? <><p className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-semibold text-slate-800">สกิล {c.wiCode} · {c.skillType}</span><span className="text-slate-600">ปัจจุบัน</span><LevelChip level={level ?? 0}/><span className="text-slate-600">เป้าหมาย</span><LevelChip level={c.skillToLevel}/><span className="text-xs text-slate-500">{LEVEL_LABELS[c.skillToLevel]}</span></p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{reached ? 'ระดับปัจจุบันถึงเป้าหมายของหลักสูตรแล้ว ไม่ต้องเสนอปรับระดับ' : 'การรับรองนี้ยืนยันผลสอบ (ความรู้) เท่านั้น · ต้องประเมินหน้างานจริงก่อน จึงเสนอปรับระดับสกิลได้'}</p></>
      : <><p className="font-semibold text-slate-800">ไม่ผูกกับสกิล</p><p className="mt-2 text-xs leading-5 text-slate-500">หลักสูตรนี้จบที่การรับรองผลสอบและใบรับรอง ไม่มีการปรับระดับสกิล</p></>}</div>
    <details className="self-start text-sm"><summary className="cursor-pointer text-blue-700">ดูรายละเอียดประกอบการตัดสินใจ</summary>
      <div className="overflow-x-auto"><table className="mt-2 w-full text-xs"><thead className="text-left text-slate-500"><tr><th className="py-1">บทเรียน</th><th>เรียนจบเมื่อ</th><th>คำถามระหว่างวิดีโอ</th><th>ดูวิดีโอจริง</th></tr></thead><tbody>{c.lessons.map(l => <tr key={l.id} className="border-t border-blue-50"><td className="py-1">{l.title}</td><td>{e.lessonDone[l.id] ? formatThaiDateTime(e.lessonDone[l.id].at) : '-'}</td><td>{e.lessonDone[l.id]?.checkpointTotal ? `${e.lessonDone[l.id].checkpointCorrect}/${e.lessonDone[l.id].checkpointTotal}` : '-'}</td><td>{e.lessonDone[l.id]?.watchedPct !== undefined ? `${e.lessonDone[l.id].watchedPct}%` : '-'}</td></tr>)}</tbody></table></div>
      <button className="mt-2 text-xs text-blue-700 hover:underline" onClick={() => setShowLog(!showLog)}>{showLog ? 'ซ่อน' : 'แสดง'}บันทึกการดำเนินการ</button>{showLog && <div className="mt-2"><EventTimeline events={e.events}/></div>}</details>
    <div className="space-y-3 border-t border-blue-100 pt-4">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Field label="หมายเหตุ (จำเป็นเมื่อส่งกลับ)"><textarea className={inputClass} rows={2} value={remark} onChange={x => setRemark(x.target.value)} placeholder="เช่น ผลสอบผ่านแต่หน้างานยังต้องทบทวนขั้นตอน…"/></Field>
      <Can id="queue" action="edit"><div className="flex flex-wrap gap-3"><button className={buttonClass} onClick={() => decide(true)}>รับรองผลและออกใบรับรอง</button><button className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => decide(false)}>ส่งกลับให้ทบทวน</button></div></Can></div>
  </article>;
}

export function ChiefLmsCertifyPage() {
  const lms = useLms(); const [message, setMessage] = useState(''); const { isMine } = useTeam();
  const inDept = lms.enrollments.filter(e => isMine(e.employeeId));
  const pending = inDept.filter(e => e.status === 'pending-chief');
  const decided = inDept.filter(e => e.chiefReviewedAt).sort((a, b) => (b.chiefReviewedAt ?? '').localeCompare(a.chiefReviewedAt ?? ''));
  return <div className="space-y-6">
    <Can id="header"><RolePageIntro title="รับรองผลการเรียนออนไลน์" description="ตรวจผลสอบที่ลูกทีมตรงทำผ่านระบบเรียนออนไลน์ แล้วรับรองเพื่อออกใบรับรอง หรือส่งกลับให้ทบทวน" steps={['ตรวจคะแนนและการเรียนครบทุกบท','รับรองผลหรือส่งกลับพร้อมเหตุผล','ระบบออกใบรับรองให้พนักงานทันที']}/></Can>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {pending.length === 0 ? <Can id="queue"><EmptyState>ไม่มีผลการเรียนที่รอรับรอง</EmptyState></Can> : <Can id="queue"><Paged items={pending} size={6} sizes={[6, 12, 24]} boxed>{({ rows, bar }) => <><div className="grid gap-x-4 gap-y-4 xl:grid-cols-2">{rows.map(e => { const c = lms.courses.find(x => x.id === e.courseId); return c && <CertifyCard key={e.id} e={e} c={c} onResult={setMessage}/>; })}</div>{bar}</>}</Paged></Can>}
    <Can id="history"><section className={`${panelClass} p-5`}><h2 className="mb-3 font-bold text-slate-800">การตัดสินล่าสุดของลูกทีม</h2>
      {decided.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีประวัติ</p> : <Paged items={decided}>{({ rows, bar }) => <><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-2">พนักงาน</th><th>หลักสูตร</th><th>ผล</th><th>วันที่</th><th>เลขที่ใบรับรอง</th></tr></thead><tbody>{rows.map(e => <tr key={e.id} className="border-t border-blue-50"><td className="py-2">{e.employeeName}</td><td>{lms.courses.find(c => c.id === e.courseId)?.title}</td><td><EnrollmentBadge e={e}/></td><td>{formatThaiDate(e.chiefReviewedAt)}</td><td className="font-mono text-xs">{e.certificateNo ?? '-'}</td></tr>)}</tbody></table></div>{bar}</>}</Paged>}</section></Can>
  </div>;
}

export function ChiefLmsProgressPage() {
  const lms = useLms(); const { team, isMine } = useTeam();
  const [courseId, setCourseId] = useState(''); const [picked, setPicked] = useState<string[]>([]); const [due, setDue] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const courses = lms.courses.filter(c => courseAudience(c, ACTORS.chief.department));
  // รายการที่ต้องให้หัวหน้าดำเนินการ (ติดล็อก, เลยกำหนด) ขึ้นก่อน จะได้ไม่ซ่อนอยู่หน้าหลัง
  const urgency = (e: Enrollment) => e.status === 'locked' ? 0 : isOverdue(e) ? 1 : 2;
  const rows = lms.enrollments.filter(e => isMine(e.employeeId)).sort((a, b) => urgency(a) - urgency(b) || a.employeeName.localeCompare(b.employeeName, 'th'));
  const overdue = rows.filter(e => isOverdue(e)).length;
  function assign(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      if (!courseId) throw new Error('เลือกหลักสูตร'); if (!picked.length) throw new Error('เลือกพนักงานอย่างน้อย 1 คน');
      const skipped = lmsActions.assign(courseId, 'chief', team.filter(t => picked.includes(t.id)).map(t => ({ id: t.id, name: t.name, department: t.department })), due || undefined);
      setMessage(`มอบหมายแล้ว ${picked.length - skipped.length} คน${skipped.length ? ` · ข้าม ${skipped.length} คน (${skipped.join('; ')})` : ''}`); setPicked([]);
    } catch (x) { setError((x as Error).message); }
  }
  function unlock(id: string, note: string) { setError(''); setMessage(''); try { lmsActions.unlock('chief', id, note); setMessage('ปลดล็อกสิทธิ์สอบแล้ว พนักงานต้องทบทวนบทเรียนใหม่'); return true; } catch (x) { setError((x as Error).message); return false; } }
  return <div className="space-y-6">
    <Can id="header"><RolePageIntro title="ความคืบหน้าการเรียนของทีม" description="ติดตามการเรียนออนไลน์ของลูกทีมตรง มอบหมายหลักสูตรพร้อมกำหนดเสร็จ และปลดล็อกสิทธิ์สอบ"/></Can>
    <Can id="metrics"><div className="grid gap-4 md:grid-cols-4"><Metric label="รายการเรียนของลูกทีม" value={rows.length}/><Metric label="กำลังเรียน" value={rows.filter(e => ['in-progress', 'returned'].includes(e.status)).length}/><Metric label="เลยกำหนด" value={overdue}/><Metric label="รอปลดล็อก" value={rows.filter(e => e.status === 'locked').length}/></div></Can>
    <Can id="assign"><form onSubmit={assign} className={`${panelClass} space-y-4 p-5`}><h2 className="font-bold text-slate-800">มอบหมายหลักสูตรให้ทีม</h2>
      <div className="grid gap-4 md:grid-cols-2"><Field label="หลักสูตร"><select className={inputClass} value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">เลือกหลักสูตร</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></Field>
        <Field label="กำหนดเรียนให้เสร็จ (ไม่บังคับ)"><input type="date" min={bkkDate()} className={inputClass} value={due} onChange={e => setDue(e.target.value)}/></Field></div>
      <fieldset><legend className="mb-2 text-sm font-medium text-slate-600">พนักงาน <button type="button" className="ml-2 text-xs text-blue-700 hover:underline" onClick={() => setPicked(picked.length === team.length ? [] : team.map(t => t.id))}>{picked.length === team.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</button></legend>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{team.map(t => <label key={t.id} className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-blue-50"><input type="checkbox" checked={picked.includes(t.id)} onChange={() => setPicked(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])}/>{t.name}</label>)}</div></fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <Can id="assign" action="create"><button className={buttonClass}>มอบหมายหลักสูตร</button></Can></form></Can>
    <Can id="learners"><section className={`${panelClass} p-5`}><h2 className="mb-3 font-bold text-slate-800">สถานะการเรียนรายบุคคล <span className="text-sm font-normal text-slate-500">({rows.length} รายการ)</span></h2>
      {rows.length === 0 ? <p className="text-sm text-slate-500">ลูกทีมตรงยังไม่มีการลงทะเบียน</p> : <LearnerTable rows={rows} courses={lms.courses} onUnlock={unlock}/>}</section></Can>
  </div>;
}
