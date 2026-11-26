import type { ReactNode } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { LEVEL_LABELS, SKILL_WIS, bangkokYear, employeesForYear } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { COURSE_STATUS, ENROLLMENT_STATUS, isExpired, isOverdue, skillFit, skillKey } from '../../data/lmsCore';
import type { Course, Enrollment } from '../../data/lmsCore';

const tone = {
  slate: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-800',
  green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700',
};
export function Pill({ tone: t = 'slate', children }: { tone?: keyof typeof tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[t]}`}>{children}</span>;
}
export function EnrollmentBadge({ e }: { e: Enrollment }) {
  if (isExpired(e)) return <Pill tone="red">ใบรับรองหมดอายุ</Pill>;
  const t = e.status === 'certified' ? 'green' : e.status === 'pending-chief' ? 'blue' : e.status === 'locked' ? 'red' : e.status === 'returned' ? 'amber' : 'slate';
  return <span className="inline-flex flex-wrap items-center gap-1.5"><Pill tone={t}>{ENROLLMENT_STATUS[e.status]}</Pill>{isOverdue(e) && <Pill tone="red">เลยกำหนด</Pill>}</span>;
}
export function CourseStatusBadge({ c }: { c: Course }) { return <Pill tone={c.status === 'published' ? 'green' : c.status === 'draft' ? 'amber' : 'slate'}>{COURSE_STATUS[c.status]}</Pill>; }
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'ความคืบหน้า'} className="h-2 w-full overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${value}%` }}/></div>;
}
export function formatThaiDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' });
}
export function formatThaiDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function EventTimeline({ events }: { events: Enrollment['events'] }) {
  return <ol className="space-y-2 border-l-2 border-blue-100 pl-4 text-xs text-slate-600">{events.slice().reverse().map((x, i) => <li key={i}><span className="font-semibold text-slate-700">{x.action}</span>{x.note && <> · {x.note}</>}<div className="text-slate-400">{x.actor} · {formatThaiDateTime(x.at)}</div></li>)}</ol>;
}

/** ระดับปัจจุบันของพนักงานในสกิลที่หลักสูตรนี้พัฒนา (undefined ถ้าหลักสูตรไม่ผูกสกิล) */
export function useSkillLevel(employeeId: string | undefined, course: Pick<Course, 'wiCode' | 'skillType'>) {
  const state = useSkillState(); const key = skillKey(course);
  if (!key || !employeeId) return undefined;
  return employeesForYear(state, bangkokYear()).find(e => e.id === employeeId)?.scores[key] ?? 0;
}
const levelTone = ['bg-slate-100 text-slate-600', 'bg-amber-50 text-amber-800', 'bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700'];
export function LevelChip({ level }: { level: number }) { return <span title={LEVEL_LABELS[level]} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${levelTone[level] ?? levelTone[0]}`}>Lv {level}</span>; }
/** เป้าหมายสกิลของหลักสูตร: W/I · ประเภท · ระดับเริ่มต้น → เป้าหมาย (+ ระดับปัจจุบันถ้ามี) */
export function SkillGoal({ course, current, tone = 'light' }: { course: Course; current?: number; tone?: 'light' | 'dark' }) {
  if (!course.skillToLevel || !course.wiCode) return null;
  const wi = SKILL_WIS.find(w => w.code === course.wiCode); const type = wi?.types.find(t => t.code === course.skillType);
  const fit = current === undefined ? 'none' : skillFit(course, current);
  const dark = tone === 'dark';
  return <div className={`rounded-xl border p-4 ${dark ? 'border-white/20 bg-white/10 text-white' : 'border-blue-100 bg-blue-50/60 text-slate-700'}`}>
    <p className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? 'text-blue-100' : 'text-blue-700'}`}><Target size={14}/>สกิลที่หลักสูตรนี้ช่วยยกระดับ</p>
    <p className={`mt-1 text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{course.wiCode} · {wi?.name.replace(/\s*\(.*\)$/, '') ?? ''}</p>
    <p className={`text-xs ${dark ? 'text-blue-100' : 'text-slate-500'}`}>ประเภท {course.skillType}{type ? ` · ${type.label}` : ''}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><LevelChip level={course.skillFromLevel}/><TrendingUp size={14} className={dark ? 'text-blue-100' : 'text-slate-400'}/><LevelChip level={course.skillToLevel}/><span className={dark ? 'text-blue-100' : 'text-slate-500'}>{LEVEL_LABELS[course.skillToLevel]}</span></div>
    {current !== undefined && <p className={`mt-2 text-xs ${dark ? 'text-blue-100' : 'text-slate-500'}`}>ระดับปัจจุบันของคุณ: <span className="font-bold">Lv {current}</span>{fit === 'recommended' && ' · เหมาะกับคุณตอนนี้'}{fit === 'too-early' && ' · ควรพัฒนาระดับก่อนหน้าก่อน'}{fit === 'reached' && ' · ถึงเป้าหมายแล้ว'}</p>}
    <p className={`mt-2 text-[11px] leading-5 ${dark ? 'text-blue-200' : 'text-slate-400'}`}>สอบผ่านและ Chief รับรองแล้ว ต้องผ่านประเมินหน้างานก่อน จึงเสนอปรับระดับให้ Manager ยืนยัน</p>
  </div>;
}
