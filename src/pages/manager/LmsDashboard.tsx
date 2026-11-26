import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACTORS, bangkokYear, employeesForYear, SKILL_DEPARTMENTS, SKILL_WIS } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { useLms } from '../../data/lmsStore';
import { COURSE_CATEGORIES, isExpired } from '../../data/lmsCore';
import type { Enrollment } from '../../data/lmsCore';
import { COMPLIANCE_TARGET, lmsAnalytics } from '../../data/lmsAnalytics';
import { downloadCsv } from '../../lib/phase1Export';
import { Avatar } from '../../components/Avatar';
import { Field, inputClass, panelClass } from '../../components/Phase1Shared';
import { Paged } from '../../components/Paged';
import { formatThaiDate, Pill } from '../../components/lms/LmsShared';

type Data = ReturnType<typeof lmsAnalytics>;
type Queue = 'mandatory' | 'overdue' | 'locked' | 'pending' | 'practical' | 'expiry';
const pct = (value: number | null) => value === null ? 'ไม่มีข้อมูล' : `${value}%`;
const STATUS_COLOR: Record<string, string> = { certified: 'bg-emerald-500', pending: 'bg-amber-400', learning: 'bg-blue-500', locked: 'bg-red-500' };
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-slate-500';
const td = 'px-3 py-3';

function Panel({ title, note, action, children, className = '' }: { title: string; note?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`${panelClass} flex min-w-0 flex-col ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-2 px-5 pb-3 pt-5"><div><h2 className="font-bold text-slate-900">{title}</h2>{note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}</div>{action}</header>
    <div className="flex-1 px-5 pb-5">{children}</div>
  </section>;
}

/** แท่งแนวนอนพร้อมตัวเลขกำกับ ใช้กับขั้นตอนการเรียนและการยกระดับสกิล */
function Steps({ items }: { items: { label: string; count: number }[] }) {
  const base = items[0].count;
  return <ol className="space-y-3">{items.map((item, i) => { const share = base ? Math.round(item.count / base * 100) : 0; const lost = i ? items[i - 1].count - item.count : 0;
    return <li key={item.label} title={`${item.label}: ${item.count} รายการ (${share}% ของขั้นแรก)`}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="text-slate-700">{item.label}</span><span className="tabular-nums"><strong className="text-slate-900">{item.count}</strong><span className="ml-2 text-xs text-slate-500">{share}%</span></span></div>
      <div className="h-2.5"><div className="h-full rounded-r bg-blue-600" style={{ width: `${share}%`, minWidth: item.count ? 4 : 0 }}/></div>
      {lost > 0 && <p className="mt-0.5 text-[11px] text-slate-500">ค้างจากขั้นก่อนหน้า {lost}</p>}
    </li>; })}</ol>;
}

function Headline({ data }: { data: Data }) {
  const rate = data.compliance.rate; const met = rate !== null && rate >= COMPLIANCE_TARGET;
  const side = [
    { label: 'พนักงานที่ได้เรียนแล้ว', value: `${data.kpi.learners}`, note: `จาก ${data.kpi.headcount} คนในขอบเขต` },
    { label: 'อัตราเรียนจนได้รับรอง', value: pct(data.kpi.completion), note: `${data.kpi.certified} จาก ${data.kpi.enrollments} การลงทะเบียน` },
    { label: 'สอบผ่านตั้งแต่ครั้งแรก', value: pct(data.kpi.firstPass), note: 'บอกความยากของข้อสอบและคุณภาพเนื้อหา' },
    { label: 'เลยกำหนดเรียน', value: `${data.kpi.overdue}`, note: 'รายการที่ยังไม่จบและพ้นวันครบกำหนด' },
  ];
  return <section className="grid gap-4 xl:grid-cols-12" aria-label="ตัวชี้วัดหลัก">
    <div className="rounded-xl bg-blue-900 p-6 text-white xl:col-span-5">
      <p className="text-sm text-blue-100">การอบรมหลักสูตรบังคับครบถ้วน</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3"><span className="text-5xl font-bold tracking-tight">{pct(rate)}</span><span className="text-sm text-blue-100">เป้าหมาย {COMPLIANCE_TARGET}%</span></p>
      <div className="relative mt-4 h-2.5 rounded bg-blue-700" role="img" aria-label={`ครบถ้วน ${pct(rate)} เป้าหมาย ${COMPLIANCE_TARGET}%`}><div className="h-full rounded bg-white" style={{ width: `${rate ?? 0}%` }}/><span className="absolute -top-1 h-4.5 w-0.5 bg-amber-300" style={{ left: `${COMPLIANCE_TARGET}%` }}/></div>
      <p className="mt-3 text-sm leading-6 text-blue-50">{!data.compliance.required ? 'ไม่มีหลักสูตรบังคับในขอบเขตที่เลือก' : met ? 'ถึงเป้าหมายแล้ว ติดตามใบรับรองที่ใกล้หมดอายุต่อ' : `ยังขาดอีก ${data.compliance.required - data.compliance.done} รายการ จากที่ต้องมีใบรับรองทั้งหมด ${data.compliance.required} รายการ`}</p>
    </div>
    <dl className={`${panelClass} grid overflow-hidden sm:grid-cols-2 xl:col-span-7`}>{side.map((s, i) => <div key={s.label} className={`p-5 ${i % 2 ? 'sm:border-l' : ''} ${i > 1 ? 'border-t' : i ? 'border-t sm:border-t-0' : ''} border-slate-100`}><dt className="text-sm text-slate-500">{s.label}</dt><dd className="mt-1 text-3xl font-bold text-slate-900">{s.value}</dd><dd className="mt-1 text-xs text-slate-500">{s.note}</dd></div>)}</dl>
  </section>;
}

function FollowUp({ data, avatar, scopeKey, onNavigate }: { data: Data; avatar: (id: string) => string | undefined; scopeKey: string; onNavigate: (page: string) => void }) {
  const [queue, setQueue] = useState<Queue>('overdue');
  const title = (e: Enrollment) => data.courseOf.get(e.courseId)?.title ?? '';
  const row = (e: Enrollment, detail: string) => ({ key: e.id, id: e.employeeId, name: e.employeeName, department: e.department, course: title(e), detail });
  const queues: { id: Queue; label: string; owner: string; rows: ReturnType<typeof row>[] }[] = [
    { id: 'overdue', label: 'เลยกำหนด', owner: 'หัวหน้างานติดตาม', rows: data.followUp.overdue.map(e => row(e, `ครบกำหนด ${formatThaiDate(e.dueDate)}`)) },
    { id: 'mandatory', label: 'ขาดอบรมบังคับ', owner: 'หัวหน้างานและผู้ดูแลระบบมอบหมาย', rows: data.notCompliant.map(({ p, c }) => ({ key: `${p.id}|${c.id}`, id: p.id, name: p.name, department: p.department, course: c.title, detail: data.rows.some(e => e.employeeId === p.id && e.courseId === c.id) ? 'ลงทะเบียนแล้ว ยังไม่ได้รับรอง' : 'ยังไม่ได้ลงทะเบียน' })) },
    { id: 'pending', label: 'รอหัวหน้ารับรอง', owner: 'หัวหน้างานรับรองผล', rows: data.followUp.pending.map(e => row(e, `สอบผ่าน ${formatThaiDate(e.passedAt)}`)) },
    { id: 'locked', label: 'สอบไม่ผ่านจนติดล็อก', owner: 'หัวหน้างานทบทวนแล้วปลดล็อก', rows: data.followUp.locked.map(e => row(e, `สอบแล้ว ${e.attempts.length} ครั้ง`)) },
    { id: 'practical', label: 'รอประเมินหน้างาน', owner: 'หัวหน้างานประเมิน', rows: data.followUp.practical.map(e => row(e, `รับรองเมื่อ ${formatThaiDate(e.certifiedAt)}`)) },
    { id: 'expiry', label: 'ใบรับรองใกล้หมดหรือหมดอายุ', owner: 'มอบหมายอบรมซ้ำ', rows: data.followUp.expiry.map(e => row(e, `${isExpired(e, data.today) ? 'หมดอายุแล้ว' : 'หมดอายุ'} ${formatThaiDate(e.expiryDate)}`)) },
  ];
  const active = queues.find(q => q.id === queue)!;
  const exportCsv = () => downloadCsv(`lms-follow-up-${active.id}-${data.today}.csv`, [['เรื่อง', 'รหัส', 'ชื่อ', 'แผนก', 'หลักสูตร', 'รายละเอียด', 'ผู้ดำเนินการ'], ...active.rows.map(r => [active.label, r.id, r.name, r.department, r.course, r.detail, active.owner])]);
  return <Panel title="รายการที่ต้องติดตาม" note="เลือกเรื่องเพื่อดูรายชื่อ ผู้จัดการดูได้อย่างเดียว ส่วนการดำเนินการเป็นของผู้ที่ระบุ"
    action={<button type="button" onClick={exportCsv} disabled={!active.rows.length} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download size={15}/>ส่งออกรายชื่อ</button>}>
    <div className="grid gap-2 sm:grid-cols-3 2xl:grid-cols-6" role="tablist" aria-label="เรื่องที่ต้องติดตาม">{queues.map(q => <button key={q.id} type="button" role="tab" aria-selected={q.id === queue} onClick={() => setQueue(q.id)} className={`rounded-lg border px-3 py-2.5 text-left ${q.id === queue ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-2xl font-bold text-slate-900">{q.rows.length}</span><span className="block text-xs leading-5 text-slate-600">{q.label}</span></button>)}</div>
    <p className="my-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>ผู้ดำเนินการ: <strong className="text-slate-700">{active.owner}</strong></span>{data.awaitingManager > 0 && <button type="button" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline" onClick={() => onNavigate('manager-skill-approvals')}>มีข้อเสนอปรับสกิลจากผลเรียนรอคุณยืนยัน {data.awaitingManager} รายการ<ArrowRight size={13}/></button>}</p>
    {!active.rows.length ? <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">ไม่มีรายการ{active.label}ในขอบเขตที่เลือก</p> :
      <Paged items={active.rows} unit="รายการ" resetKey={`${queue}|${scopeKey}`}>{({ rows, bar }) => <div className="overflow-hidden rounded-lg border border-slate-200"><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm"><thead className="bg-slate-50"><tr><th className={th}>พนักงาน</th><th className={th}>แผนก</th><th className={th}>หลักสูตร</th><th className={th}>รายละเอียด</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.key} className="border-t border-slate-100"><td className={td}><div className="flex items-center gap-3"><Avatar src={avatar(r.id)} name={r.name} size="sm"/><div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-500">{r.id}</p></div></div></td><td className={`${td} text-slate-600`}>{r.department}</td><td className={`${td} text-slate-700`}>{r.course}</td><td className={`${td} text-xs text-slate-600`}>{r.detail}</td></tr>)}</tbody></table></div>{bar}</div>}</Paged>}
  </Panel>;
}

export default function ManagerLmsDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const lms = useLms(); const skill = useSkillState();
  const [department, setDepartment] = useState('ALL'); const [category, setCategory] = useState('ALL'); const [onlyUncovered, setOnlyUncovered] = useState(false);
  const people = employeesForYear(skill, bangkokYear()).filter(p => p.id !== ACTORS.manager.employeeId && p.id !== 'EMP999');
  const data = lmsAnalytics(lms, people, skill.adjustments, SKILL_WIS, { department, category });
  const scopeKey = `${department}|${category}`;
  const gaps = data.gaps.filter(g => !onlyUncovered || !g.course);
  const total = data.rows.length;

  function exportSummary() {
    downloadCsv(`lms-manager-summary-${data.today}.csv`, [
      ['ภาพรวมการเรียนออนไลน์', data.today], ['แผนก', department === 'ALL' ? 'ทุกแผนก' : department], ['หมวดหลักสูตร', category === 'ALL' ? 'ทุกหมวด' : category],
      ['อบรมบังคับครบถ้วน (%)', data.compliance.rate ?? ''], ['พนักงานที่ได้เรียน', data.kpi.learners], ['พนักงานในขอบเขต', data.kpi.headcount], ['เลยกำหนด', data.kpi.overdue], [],
      ['แผนก', 'พนักงาน', 'ได้เรียนแล้ว', 'อบรมบังคับครบ (%)', 'ขาดอบรมบังคับ', 'ใบรับรองใช้ได้', 'เลยกำหนด'], ...data.departments.map(d => [d.department, d.headcount, d.learners, d.compliance ?? '', d.missing, d.certified, d.overdue]), [],
      ['หลักสูตร', 'รหัส', 'ผู้เรียน', 'ได้รับรอง (%)', 'ผ่านครั้งแรก (%)', 'คะแนนเฉลี่ย', 'เลยกำหนด', 'ติดล็อก', 'ข้อสังเกต'], ...data.courseRows.map(r => [r.course.title, r.course.code, r.enrolled, r.completion ?? '', r.firstPass ?? '', r.average ?? '', r.overdue, r.locked, r.signal.label]), [],
      ['W/I', 'ประเภท', 'แผนก', 'ยังทำเองไม่ได้', 'คนในแผนก', 'หลักสูตรรองรับ', 'ลงเรียนแล้ว'], ...data.gaps.map(g => [g.wiCode, g.type, g.department, g.below, g.people, g.course?.title ?? 'ยังไม่มี', g.enrolled]),
    ]);
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">ภาพรวมการเรียนออนไลน์</h1><p className="mt-1 text-sm text-slate-500">ข้อมูล ณ {formatThaiDate(data.today)} · ความครบถ้วนของการอบรม ผลการเรียน และการยกระดับสกิล</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48"><Field label="แผนก"><select className={inputClass} value={department} onChange={e => setDepartment(e.target.value)}><option value="ALL">ทุกแผนก</option>{SKILL_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field></div>
        <div className="w-48"><Field label="หมวดหลักสูตร"><select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">ทุกหมวด</option>{COURSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field></div>
        <button type="button" onClick={exportSummary} className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Download size={16}/>ส่งออกสรุป</button>
      </div>
    </div>

    <Headline data={data}/>

    <div className="grid gap-5 xl:grid-cols-12">
      <Panel className="xl:col-span-7" title="อบรมบังคับรายแผนก" note={`เรียงจากแผนกที่ต้องเร่งก่อน · เส้นสีเข้มคือเป้าหมาย ${COMPLIANCE_TARGET}%`}>
        {!data.mandatory.length ? <p className="text-sm text-slate-500">ไม่มีหลักสูตรบังคับในหมวดที่เลือก</p> : <ul className="space-y-4">{data.departments.map(d => <li key={d.department}>
          <button type="button" className="w-full rounded-lg p-1 text-left hover:bg-slate-50" aria-label={`กรองเฉพาะแผนก ${d.department}`} onClick={() => setDepartment(d.department)}>
            <span className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold text-slate-800">{d.department}</span><span className="tabular-nums"><strong className="text-slate-900">{pct(d.compliance)}</strong><span className="ml-2 text-xs text-slate-500">ขาด {d.missing} จาก {d.headcount} คน · เลยกำหนด {d.overdue}</span></span></span>
            <span className="relative mt-1.5 block h-3 rounded bg-blue-50"><span className="block h-full rounded bg-blue-600" style={{ width: `${d.compliance ?? 0}%` }}/><span className="absolute -top-0.5 h-4 w-0.5 bg-slate-700" style={{ left: `${COMPLIANCE_TARGET}%` }}/></span>
          </button></li>)}</ul>}
      </Panel>
      <Panel className="xl:col-span-5" title="สถานะการเรียนตอนนี้" note={`${total} การลงทะเบียน`}>
        {!total ? <p className="text-sm text-slate-500">ยังไม่มีการลงทะเบียน</p> : <>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded" role="img" aria-label={data.statusMix.map(s => `${s.label} ${s.count}`).join(' ')}>{data.statusMix.filter(s => s.count).map(s => <div key={s.key} title={`${s.label} ${s.count}`} className={STATUS_COLOR[s.key]} style={{ width: `${s.count / total * 100}%` }}/>)}</div>
          <ul className="mt-4 divide-y divide-slate-100">{data.statusMix.map(s => <li key={s.key} className="flex items-center justify-between py-2.5 text-sm"><span className="flex items-center gap-2 text-slate-700"><span className={`h-2.5 w-2.5 rounded-sm ${STATUS_COLOR[s.key]}`}/>{s.label}</span><span className="tabular-nums"><strong className="text-slate-900">{s.count}</strong><span className="ml-2 inline-block w-10 text-right text-xs text-slate-500">{Math.round(s.count / total * 100)}%</span></span></li>)}</ul></>}
      </Panel>
    </div>

    <FollowUp data={data} scopeKey={scopeKey} onNavigate={onNavigate} avatar={id => people.find(p => p.id === id)?.avatarUrl}/>

    <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-12">
      <Panel className="lg:col-span-2 2xl:col-span-6" title="แนวโน้ม 6 เดือน" note="จำนวนที่ลงทะเบียนใหม่ เทียบกับที่ได้รับรองผลในเดือนนั้น">
        <div className="h-64" role="img" aria-label={`แนวโน้มรายเดือน ${data.trend.map(t => `${t.month} ลงทะเบียน ${t.enrolled} รับรอง ${t.certified}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.trend} barGap={2} margin={{ top: 18, right: 4, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8f0"/><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false}/><Tooltip cursor={{ fill: '#f1f5f9' }}/><Legend wrapperStyle={{ fontSize: 12 }}/>
          <Bar dataKey="enrolled" name="ลงทะเบียนใหม่" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false}><LabelList dataKey="enrolled" position="top" fontSize={11} fill="#475569"/></Bar>
          <Bar dataKey="certified" name="ได้รับรองผล" fill="#1baf7a" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false}><LabelList dataKey="certified" position="top" fontSize={11} fill="#475569"/></Bar></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel className="2xl:col-span-3" title="เรียนค้างอยู่ขั้นไหน" note="จากลงทะเบียนถึงหัวหน้ารับรอง"><Steps items={data.funnel}/></Panel>
      <Panel className="2xl:col-span-3" title="ผลเรียนกลายเป็นสกิลหรือยัง" note="เฉพาะหลักสูตรที่ผูกกับระดับสกิล"><Steps items={data.transfer}/></Panel>
    </div>

    <Panel title="ประสิทธิผลรายหลักสูตร" note="หลักสูตรที่ควรทบทวนเรียงขึ้นก่อน · ผ่านครั้งแรกต่ำกว่า 65% (จากผู้สอบ 5 คนขึ้นไป) ควรทบทวนเนื้อหาหรือข้อสอบ">
      <Paged items={data.courseRows} unit="หลักสูตร" resetKey={scopeKey}>{({ rows, bar }) => <div className="overflow-hidden rounded-lg border border-slate-200"><div className="overflow-x-auto"><table className="w-full min-w-[52rem] text-sm"><thead className="bg-slate-50"><tr><th className={th}>หลักสูตร</th><th className={`${th} text-right`}>ผู้เรียน</th><th className={`${th} text-right`}>ได้รับรอง</th><th className={`${th} text-right`}>ผ่านครั้งแรก</th><th className={`${th} text-right`}>คะแนนเฉลี่ย</th><th className={`${th} text-right`}>เลยกำหนด</th><th className={`${th} text-right`}>ติดล็อก</th><th className={th}>ข้อสังเกต</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.course.id} className="border-t border-slate-100 tabular-nums"><td className={td}><p className="font-semibold text-slate-800">{r.course.title}</p><p className="text-xs text-slate-500">{r.course.code} · {r.course.category}{r.course.mandatory ? ' · หลักสูตรบังคับ' : ''}</p></td><td className={`${td} text-right`}>{r.enrolled}</td><td className={`${td} text-right`}>{pct(r.completion)}</td><td className={`${td} text-right`}>{pct(r.firstPass)}</td><td className={`${td} text-right`}>{r.average ?? 'ไม่มีข้อมูล'}</td><td className={`${td} text-right`}>{r.overdue}</td><td className={`${td} text-right`}>{r.locked}</td><td className={`${td} whitespace-nowrap`}><Pill tone={r.signal.tone}>{r.signal.label}</Pill></td></tr>)}</tbody></table></div>{bar}</div>}</Paged>
    </Panel>

    <Panel title="ช่องว่างสกิลเทียบกับหลักสูตรที่มี" note={`คนที่ยังทำงานเองไม่ได้ (ต่ำกว่าระดับ 2) เรียงจากมากไปน้อย · ${data.gapsWithoutCourse} จาก ${data.gaps.length} สกิลยังไม่มีหลักสูตรรองรับ · ไม่ขึ้นกับตัวกรองหมวดหลักสูตร`}
      action={<label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyUncovered} onChange={e => setOnlyUncovered(e.target.checked)}/>เฉพาะที่ยังไม่มีหลักสูตร</label>}>
      {!gaps.length ? <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">ไม่มีช่องว่างสกิลตามเงื่อนไขที่เลือก</p> :
        <Paged items={gaps} unit="สกิล" resetKey={`${department}|${onlyUncovered}`}>{({ rows, bar }) => <div className="overflow-hidden rounded-lg border border-slate-200"><div className="overflow-x-auto"><table className="w-full min-w-[52rem] text-sm"><thead className="bg-slate-50"><tr><th className={th}>สกิล (W/I · ประเภท)</th><th className={th}>แผนก</th><th className={`${th} w-64`}>ยังทำเองไม่ได้</th><th className={th}>หลักสูตรรองรับ</th></tr></thead>
          <tbody>{rows.map(g => <tr key={g.key} className="border-t border-slate-100"><td className={td}><p className="font-semibold text-slate-800">{g.wiCode} · {g.type} {g.typeLabel}</p><p className="max-w-sm truncate text-xs text-slate-500" title={g.wiName}>{g.wiName}</p></td><td className={`${td} text-slate-600`}>{g.department}</td><td className={td}><div className="flex items-center gap-3"><div className="h-2 flex-1 rounded bg-blue-50"><div className="h-full rounded bg-blue-600" style={{ width: `${g.share}%` }}/></div><span className="w-28 text-right text-xs tabular-nums text-slate-600"><strong className="text-sm text-slate-900">{g.below}</strong> / {g.people} คน</span></div></td><td className={td}>{g.course ? <><p className="text-slate-700">{g.course.title}</p><p className="text-xs text-slate-500">ลงเรียนแล้ว {g.enrolled} จาก {g.below} คน</p></> : <Pill tone="amber">ยังไม่มีหลักสูตร</Pill>}</td></tr>)}</tbody></table></div>{bar}</div>}</Paged>}
    </Panel>
  </div>;
}
