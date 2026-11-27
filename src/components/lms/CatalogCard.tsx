import { Can } from '../Permission';
import { Award, BookOpen, CircleCheck, Clock, Lock, MoveRight } from 'lucide-react';
import { LEVEL_LABELS, SKILL_WIS } from '../../data/phase1Core';
import { progressPercent, skillFit } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';
import { EnrollmentBadge, LevelChip, Pill } from './LmsShared';

/** แถบเป้าหมายสกิลแบบย่อ สูงเท่ากันทุกใบ เพื่อให้การ์ดในแถวเดียวกันเรียงตรงกัน */
function SkillStrip({ course, current }: { course: Course; current: number }) {
  const box = 'flex h-[4.25rem] flex-col justify-center gap-1.5 rounded-lg px-3';
  if (!course.skillToLevel || !course.wiCode) return <div className={`${box} border border-dashed border-slate-200`}><p className="text-xs text-slate-500">หลักสูตรทั่วไป · ไม่ผูกกับระดับสกิล</p></div>;
  const wi = SKILL_WIS.find(w => w.code === course.wiCode); const type = wi?.types.find(t => t.code === course.skillType);
  return <div className={`${box} bg-blue-50/70`} title={`${course.wiCode} · ${wi?.name ?? ''}`}>
    <p className="truncate text-xs font-semibold text-slate-800">{course.wiCode} · {course.skillType}{type ? ` ${type.label}` : ''}</p>
    <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
      <LevelChip level={course.skillFromLevel}/><MoveRight size={14} aria-hidden="true" className="text-slate-400"/><LevelChip level={course.skillToLevel}/>
      <span className="ml-auto truncate pl-2">คุณอยู่ <strong className="font-semibold text-slate-700" title={LEVEL_LABELS[current]}>Lv {current}</strong></span>
    </p>
  </div>;
}

export default function CatalogCard({ course: c, enrollment: e, current, blockedBy, onStart }: {
  course: Course; enrollment?: Enrollment; current: number;
  /** ชื่อหลักสูตรที่ต้องผ่านก่อน (ว่าง = สมัครได้) */
  blockedBy: string[]; onStart: () => void;
}) {
  const fit = skillFit(c, current); const blocked = !e && blockedBy.length > 0;
  const percent = e && e.status !== 'certified' ? progressPercent(c, e) : undefined;
  const label = !e ? 'สมัครเรียน' : e.status === 'certified' ? 'ดูใบรับรอง' : e.status === 'pending-chief' || e.status === 'locked' ? 'ดูสถานะ' : 'เรียนต่อ';
  const meta = 'flex items-center gap-1 whitespace-nowrap';
  return <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300">
    <div className="flex min-h-5 items-center justify-between gap-2">
      <p className="min-w-0 truncate text-xs text-slate-500">{c.code} · {c.category}</p>
      <div className="flex shrink-0 gap-1">{c.mandatory && <Pill tone="amber">บังคับ</Pill>}{fit === 'recommended' && e?.status !== 'certified' && <Pill tone="blue">แนะนำ</Pill>}{fit === 'reached' && <Pill tone="green">ถึงเป้าแล้ว</Pill>}</div>
    </div>
    <div>
      <h2 className="line-clamp-2 min-h-11 font-bold leading-snug text-slate-900" title={c.title}>{c.title}</h2>
      <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-slate-500" title={c.description}>{c.description}</p>
    </div>
    <SkillStrip course={c} current={current}/>
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      <li className={meta}><BookOpen size={13} aria-hidden="true"/>{c.lessons.length} บท</li>
      <li className={meta}><Clock size={13} aria-hidden="true"/>{c.lessons.reduce((n, l) => n + l.durationMin, 0)} นาที</li>
      <li className={meta}><CircleCheck size={13} aria-hidden="true"/>ผ่าน {c.passScore}%</li>
      {c.validityMonths > 0 && <li className={meta}><Award size={13} aria-hidden="true"/>อายุ {c.validityMonths} เดือน</li>}
    </ul>
    <div className="mt-auto flex min-h-12 items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <div className="min-w-0">
        {e ? <div className="flex items-center gap-2"><EnrollmentBadge e={e}/>{percent !== undefined && <span className="text-xs tabular-nums text-slate-500">{percent}%</span>}</div>
          : blocked ? <p className="line-clamp-2 flex gap-1 text-xs leading-4 text-amber-800" title={`ต้องผ่านก่อน: ${blockedBy.join(', ')}`}><span>ต้องผ่านก่อน: {blockedBy.join(', ')}</span></p> : null}
      </div>
      <Can id="list" action="create"><button type="button" disabled={blocked} onClick={onStart} aria-label={`${label}: ${c.title}`}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-transform active:scale-[0.98] ${blocked ? 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-500' : e && e.status !== 'in-progress' && e.status !== 'returned' ? 'border border-blue-200 bg-white text-blue-800 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {blocked && <Lock size={14} aria-hidden="true"/>}{blocked ? 'ยังล็อกอยู่' : label}
      </button></Can>
    </div>
  </article>;
}
