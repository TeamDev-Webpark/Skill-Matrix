import { Can } from '../Permission';
import { Paged } from '../Paged';
import { Fragment, useState } from 'react';
import { History, LockOpen, UserX } from 'lucide-react';
import { attemptsUsed, isOverdue, progressPercent } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';
import { bangkokYear, employeesForYear } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { Avatar } from '../Avatar';
import { buttonClass, inputClass } from '../Phase1Shared';
import { EnrollmentBadge, EventTimeline, formatThaiDate, ProgressBar } from './LmsShared';

const action = 'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400';
type Panel = { id: string; kind: 'unlock' | 'history' } | null;

/** ตารางผู้เรียนที่ใช้ร่วมกันระหว่าง Chief และ Admin: แถวสูงเท่ากัน ส่วนที่ยาว (ประวัติ / เหตุผลปลดล็อก) เปิดเป็นแถวด้านล่าง */
export default function LearnerTable({ rows, courses, showDepartment = false, resetKey, onUnlock, onRemove }: {
  rows: Enrollment[]; courses: Course[]; showDepartment?: boolean; resetKey?: string;
  onUnlock: (id: string, note: string) => boolean; onRemove?: (e: Enrollment) => void;
}) {
  const skill = useSkillState();
  const people = employeesForYear(skill, bangkokYear());
  const [panel, setPanel] = useState<Panel>(null); const [note, setNote] = useState('');
  const toggle = (id: string, kind: 'unlock' | 'history') => { setNote(''); setPanel(p => p?.id === id && p.kind === kind ? null : { id, kind }); };
  const th = 'px-3 py-3 text-left text-xs font-semibold text-slate-500';
  return <Paged items={rows} resetKey={resetKey}>{({ rows: shown, bar }) => <div className="overflow-hidden rounded-xl border border-slate-200"><div className="overflow-x-auto">
    <table className="w-full min-w-[68rem] table-fixed text-sm">
      <colgroup>{[18, 21, 11, 16, 10, 6, 18].map((w, i) => <col key={i} style={{ width: `${w}%` }}/>)}</colgroup>
      <thead className="bg-slate-50"><tr><th className={`${th} pl-4`}>พนักงาน</th><th className={th}>หลักสูตร</th><th className={th}>ความคืบหน้า</th><th className={th}>สถานะ</th><th className={th}>กำหนดเสร็จ</th><th className={`${th} text-center`}>สอบ</th><th className={`${th} pr-4 text-right`}>การจัดการ</th></tr></thead>
      <tbody>{shown.map(e => {
        const c = courses.find(x => x.id === e.courseId); if (!c) return null;
        const pct = progressPercent(c, e); const open = panel?.id === e.id ? panel.kind : null;
        return <Fragment key={e.id}>
          <tr className={`border-t border-slate-100 align-middle ${open ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}`}>
            <td className="py-3 pl-4 pr-3"><div className="flex items-center gap-3"><Avatar src={people.find(p => p.id === e.employeeId)?.avatarUrl} name={e.employeeName} size="sm"/><div className="min-w-0"><p className="truncate font-semibold text-slate-800" title={e.employeeName}>{e.employeeName}</p><p className="truncate text-xs text-slate-500">{e.employeeId}{showDepartment && ` · ${e.department}`}</p></div></div></td>
            
            <td className="px-3 py-3"><p className="truncate leading-5 text-slate-800" title={c.title}>{c.title}</p><p className="mt-0.5 truncate text-xs text-slate-400">{c.code} · {e.source === 'self' ? 'สมัครเรียนเอง' : `มอบหมายโดย ${e.assignedBy}`}</p></td>
            <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="flex-1"><ProgressBar value={pct} label={`ความคืบหน้าของ ${e.employeeName}`}/></div><span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">{pct}%</span></div></td>
            <td className="whitespace-nowrap px-3 py-3"><EnrollmentBadge e={e}/></td>
            <td className={`px-3 py-3 text-xs ${isOverdue(e) ? 'font-semibold text-red-700' : e.dueDate ? 'text-slate-700' : 'text-slate-400'}`}>{e.dueDate ? formatThaiDate(e.dueDate) : 'ไม่กำหนด'}</td>
            <td className="px-3 py-3 text-center text-xs tabular-nums text-slate-700">{attemptsUsed(e)}/{c.maxAttempts}</td>
            <td className="py-3 pl-3 pr-4"><div className={`grid items-center gap-2 ${onRemove ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button type="button" className={`${action} ${open === 'history' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`} aria-expanded={open === 'history'} aria-label={`ประวัติของ ${e.employeeName}`} title="ประวัติ" onClick={() => toggle(e.id, 'history')}><History size={14} className="shrink-0"/>ประวัติ</button>
              {onRemove && <Can id="learners" action="delete"><button type="button" disabled={e.status === 'certified'} className={`${action} border-red-200 bg-white text-red-700 hover:bg-red-50`} aria-label={`ยกเลิกการลงทะเบียนของ ${e.employeeName}`} title={e.status === 'certified' ? 'รับรองผลแล้ว ไม่สามารถยกเลิกการลงทะเบียนได้' : 'ยกเลิกการลงทะเบียน'} onClick={() => onRemove(e)}><UserX size={14} className="shrink-0"/>ยกเลิก</button></Can>}
              {e.status === 'locked' && <Can id="learners" action="edit"><button type="button" className={`${action} col-span-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`} aria-expanded={open === 'unlock'} onClick={() => toggle(e.id, 'unlock')}><LockOpen size={14} className="shrink-0"/>ปลดล็อกสิทธิ์สอบ</button></Can>}
            </div></td>
          </tr>
          {open && <tr className="bg-blue-50/50"><td colSpan={7} className="px-4 pb-4 pt-0">
            <div className="rounded-lg border border-blue-100 bg-white p-4">{open === 'history' ? <EventTimeline events={e.events}/>
              : <form className="flex flex-wrap items-center gap-3" onSubmit={x => { x.preventDefault(); if (onUnlock(e.id, note)) setPanel(null); }}>
                <label className="text-sm font-semibold text-slate-700" htmlFor={`unlock-${e.id}`}>เหตุผลที่ปลดล็อก</label>
                <input id={`unlock-${e.id}`} autoFocus className={`${inputClass} min-w-56 flex-1`} value={note} onChange={x => setNote(x.target.value)} placeholder="เช่น ทบทวนเนื้อหากับหัวหน้าแล้ว"/>
                <button className={buttonClass}>ยืนยันปลดล็อก</button><button type="button" className={`${action} h-10 border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50`} onClick={() => setPanel(null)}>ปิด</button></form>}</div></td></tr>}
        </Fragment>;
      })}</tbody>
    </table>
  </div>{bar}</div>}</Paged>;
}
