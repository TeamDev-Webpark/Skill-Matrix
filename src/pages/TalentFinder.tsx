import { Paged } from '../components/Paged';
import { useMemo, useState } from 'react';
import { Download, Plus, Search, UserCheck, X } from 'lucide-react';
import { ACTORS, LEVEL_LABELS, SKILL_DEPARTMENTS, SKILL_WIS, bangkokYear, employeesForYear, visibleEmployees } from '../data/phase1Core';
import type { Employee } from '../data/phase1Core';
import { useSkillState } from '../data/phase1Store';
import { useLms } from '../data/lmsStore';
import { isExpired } from '../data/lmsCore';
import { downloadCsv } from '../lib/phase1Export';
import { Avatar } from '../components/Avatar';
import { buttonClass, EmptyState, Field, inputClass, LevelBadge, Metric, panelClass } from '../components/Phase1Shared';
import { RolePageIntro } from '../components/RolePageIntro';

interface Criterion { id: number; wi: string; type: string; min: number; exact: boolean }
const levelTone = ['bg-slate-100 text-slate-600', 'bg-amber-50 text-amber-800', 'bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700'];
let nextId = 1;
const newCriterion = (wi = '', type = ''): Criterion => ({ id: nextId++, wi, type, min: 2, exact: false });

/** ค้นหาบุคลากรตามสกิล (W/I + ประเภท + ระดับ) เพื่อคัดเลือกเข้าหน้างาน — เฉพาะ Chief / Manager */
export default function TalentFinder({ userRole }: { userRole: 'chief' | 'manager' }) {
  const state = useSkillState(); const lms = useLms();
  const isChief = userRole === 'chief';
  const [department, setDepartment] = useState(isChief ? ACTORS.chief.department : 'ALL');
  const [criteria, setCriteria] = useState<Criterion[]>(() => [newCriterion()]);
  const [matchAll, setMatchAll] = useState(true); const [near, setNear] = useState(false); const [onDuty, setOnDuty] = useState(false);
  const [query, setQuery] = useState(''); const [picked, setPicked] = useState<string[]>([]);

  const year = bangkokYear();
  const scope = useMemo(() => visibleEmployees(employeesForYear(state, year), userRole), [state, year, userRole]);
  const departments = isChief ? [ACTORS.chief.department] : SKILL_DEPARTMENTS;
  const wiOptions = SKILL_WIS.filter(w => departments.includes(w.department) && (department === 'ALL' || w.department === department));
  const people = scope.filter(e => (department === 'ALL' || e.department === department) && (!query.trim() || `${e.name} ${e.id} ${e.position}`.toLowerCase().includes(query.trim().toLowerCase())));
  const active = criteria.filter(c => c.wi && c.type);
  const pendingKeys = new Set(state.adjustments.filter(a => a.status === 'pending').flatMap(a => a.changes.map(c => `${a.employeeId}|${c.key}`)));

  const levelOf = (e: Employee, c: Criterion): number | undefined => {
    const valid = SKILL_WIS.some(w => w.code === c.wi && w.department === e.department && w.types.some(t => t.code === c.type));
    return valid ? e.scores[`${c.wi}_${c.type}`] ?? 0 : undefined;
  };
  const meets = (lv: number | undefined, c: Criterion) => lv !== undefined && (c.exact ? lv === c.min : lv >= c.min);
  const almost = (lv: number | undefined, c: Criterion) => lv !== undefined && !meets(lv, c) && lv === c.min - 1 && !c.exact;

  const rows = useMemo(() => active.length === 0 ? [] : people.map(e => {
    const levels = active.map(c => levelOf(e, c));
    const hit = active.map((c, i) => meets(levels[i], c)); const close = active.map((c, i) => almost(levels[i], c));
    const full = matchAll ? hit.every(Boolean) : hit.some(Boolean);
    const nearMiss = !full && (matchAll ? active.every((_, i) => hit[i] || close[i]) && close.some(Boolean) : close.some(Boolean));
    const duty = active.every(c => e.assignedSkills.includes(`${c.wi}_${c.type}`));
    return { e, levels, full, nearMiss, duty, total: levels.reduce<number>((n, l) => n + (l ?? 0), 0) };
  }).filter(r => (r.full || (near && r.nearMiss)) && (!onDuty || r.duty)).sort((a, b) => Number(b.full) - Number(a.full) || b.total - a.total || a.e.name.localeCompare(b.e.name, 'th')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [people, criteria, matchAll, near, onDuty]);

  const first = active[0];
  const dist = first ? [0, 1, 2, 3].map(l => people.filter(e => levelOf(e, first) === l).length) : [];
  const noSkill = first ? people.filter(e => levelOf(e, first) === undefined).length : 0;
  const lmsCerts = (e: Employee, c: Criterion) => lms.enrollments.filter(x => x.employeeId === e.id && x.status === 'certified' && !isExpired(x)).map(x => lms.courses.find(k => k.id === x.courseId)).filter(k => k && k.wiCode === c.wi && k.skillType === c.type);
  const label = (c: Criterion) => `${c.wi} · ${c.type}`;
  const update = (id: number, patch: Partial<Criterion>) => setCriteria(list => list.map(c => c.id === id ? { ...c, ...patch } : c));
  const full = rows.filter(r => r.full).length;

  function exportCsv() {
    const chosen = rows.filter(r => !picked.length || picked.includes(r.e.id));
    downloadCsv(`talent-search-${new Date().toISOString().slice(0, 10)}.csv`, [['รหัส', 'ชื่อ', 'ตำแหน่ง', 'แผนก', ...active.map(label), 'ผลการค้นหา'],
      ...chosen.map(r => [r.e.id, r.e.name, r.e.position, r.e.department, ...r.levels.map(l => l === undefined ? 'ไม่มีสกิลนี้ในแผนก' : l), r.full ? 'ตรงเกณฑ์' : 'ใกล้ถึงเกณฑ์'])]);
  }

  return <div className="space-y-6">
    <RolePageIntro title="ค้นหาบุคลากรตามสกิล" description={`ค้นหา${isChief ? 'ลูกทีมตรงของคุณ' : 'พนักงานทุกแผนก'}ที่มีสกิลตรงกับงาน เช่น W/I และประเภทสกิลในระดับที่ต้องการ เพื่อคัดเลือกเข้าหน้างาน`} steps={['เลือก W/I ประเภทสกิล และระดับขั้นต่ำ','ดูรายชื่อที่ตรงเกณฑ์ (เพิ่มได้หลายสกิล)','เลือกรายชื่อและส่งออกเป็น CSV']}/>
    <section className={`${panelClass} space-y-5 p-5`} aria-label="เงื่อนไขการค้นหา">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Field label="แผนก"><select className={inputClass} value={department} disabled={isChief} onChange={e => { setDepartment(e.target.value); setCriteria([newCriterion()]); setPicked([]); }}>{!isChief && <option value="ALL">ทุกแผนก</option>}{departments.map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="ค้นหาชื่อ / รหัส / ตำแหน่ง"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className={`${inputClass} pl-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder="เช่น สมชาย, EMP001, Technician"/></div></Field></div>
      <div className="space-y-3">{criteria.map((c, i) => { const wi = wiOptions.find(w => w.code === c.wi); return <div key={c.id} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="flex items-center justify-between"><p className="text-sm font-bold text-blue-900">สกิลที่ต้องการ{criteria.length > 1 ? ` #${i + 1}` : ''}</p>{criteria.length > 1 && <button type="button" aria-label={`ลบเงื่อนไข ${i + 1}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setCriteria(list => list.filter(x => x.id !== c.id))}><X size={16}/></button>}</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Work Instruction"><select className={inputClass} value={c.wi} onChange={e => update(c.id, { wi: e.target.value, type: '' })}><option value="">เลือก W/I</option>{wiOptions.map(w => <option key={w.code} value={w.code}>{w.code} · {w.name.replace(/\s*\(.*\)$/, '')}{department === 'ALL' ? ` — ${w.department}` : ''}</option>)}</select></Field>
          <div><p className="mb-1.5 text-sm font-medium text-slate-600">ประเภทสกิล</p>{wi ? <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ประเภทสกิล">{wi.types.map(t => <button key={t.code} type="button" role="radio" aria-checked={c.type === t.code} onClick={() => update(c.id, { type: t.code })} className={`rounded-lg border px-3 py-2 text-sm ${c.type === t.code ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>{t.code} · {t.label}</button>)}</div> : <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400">เลือก W/I ก่อน</p>}</div></div>
        <div><p className="mb-1.5 text-sm font-medium text-slate-600">ระดับที่ต้องการ</p><div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="ระดับ">{[1, 2, 3].map(l => <button key={l} type="button" role="radio" aria-checked={c.min === l} onClick={() => update(c.id, { min: l })} className={`rounded-lg border px-3 py-2 text-sm ${c.min === l ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>{c.exact ? '' : '≥ '}Lv {l} <span className={`hidden sm:inline ${c.min === l ? 'text-blue-100' : 'text-slate-500'}`}>· {LEVEL_LABELS[l]}</span></button>)}
          <label className="ml-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={c.exact} onChange={e => update(c.id, { exact: e.target.checked })}/>เฉพาะระดับนี้พอดี</label></div></div></div>; })}
        <div className="flex flex-wrap items-center gap-4"><button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline" onClick={() => setCriteria(list => [...list, newCriterion()])}><Plus size={15}/>เพิ่มสกิลที่ต้องการ</button>
          {criteria.length > 1 && <div className="flex items-center gap-1 rounded-lg border border-slate-300 p-0.5 text-sm" role="radiogroup" aria-label="รูปแบบการจับคู่">{([true, false] as const).map(v => <button key={String(v)} type="button" role="radio" aria-checked={matchAll === v} onClick={() => setMatchAll(v)} className={`rounded-md px-3 py-1 ${matchAll === v ? 'bg-blue-600 font-semibold text-white' : 'text-slate-600'}`}>{v ? 'ต้องครบทุกสกิล' : 'อย่างน้อย 1 สกิล'}</button>)}</div>}</div></div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-blue-100 pt-4 text-sm text-slate-700">
        <label className="flex items-center gap-2"><input type="checkbox" checked={near} onChange={e => setNear(e.target.checked)}/>แสดงผู้ที่ใกล้ถึงเกณฑ์ (ต่ำกว่าเกณฑ์ 1 ระดับ) เพื่อพิจารณาอบรมเพิ่ม</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={onDuty} onChange={e => setOnDuty(e.target.checked)}/>เฉพาะผู้ที่ได้รับมอบหมายสกิลนี้ในหน้างาน</label></div>
    </section>

    {active.length === 0 ? <EmptyState>เลือก W/I และประเภทสกิลอย่างน้อย 1 รายการ เพื่อเริ่มค้นหา</EmptyState> : <>
      <div className="grid gap-4 md:grid-cols-5"><Metric label="ตรงเกณฑ์" value={full} note={`จาก ${people.length} คนในขอบเขต`}/>{[0, 1, 2, 3].map(l => <Metric key={l} label={`${label(first)} · Lv ${l}`} value={dist[l]} note={LEVEL_LABELS[l]}/>)}</div>
      {noSkill > 0 && <p className="text-xs text-slate-500">มี {noSkill} คนที่ไม่มีสกิล {label(first)} เพราะ W/I นี้อยู่คนละแผนก (ไม่นับในการกระจายระดับ)</p>}
      <section className={`${panelClass} p-5`} aria-label="ผลการค้นหา">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-slate-800">ผลการค้นหา {rows.length} คน{picked.length > 0 && <span className="ml-2 text-sm font-normal text-blue-700">เลือกไว้ {picked.length} คน</span>}</h2>
          <div className="flex gap-2">{picked.length > 0 && <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" onClick={() => setPicked([])}>ล้างที่เลือก</button>}<button className={buttonClass} disabled={!rows.length} onClick={exportCsv}><Download size={16}/>ส่งออก CSV{picked.length ? ' (ที่เลือก)' : ''}</button></div></div>
        {rows.length === 0 ? <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">ไม่พบพนักงานที่ตรงเงื่อนไข ลองลดระดับขั้นต่ำ หรือเปิด "แสดงผู้ที่ใกล้ถึงเกณฑ์"</p> :
          <Paged items={rows} unit="คน" resetKey={JSON.stringify([department, query, criteria, matchAll, near, onDuty])}>{({ rows: shown, bar }) => <><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="w-8 py-2"><span className="sr-only">เลือก</span></th><th>พนักงาน</th><th>แผนก</th>{active.map(c => <th key={c.id}>{label(c)}</th>)}<th>ข้อมูลประกอบ</th></tr></thead><tbody>
            {shown.map(r => <tr key={r.e.id} className={`border-t border-blue-50 align-top ${r.full ? '' : 'bg-amber-50/40'}`}>
              <td className="py-3"><input type="checkbox" aria-label={`เลือก ${r.e.name}`} checked={picked.includes(r.e.id)} onChange={() => setPicked(p => p.includes(r.e.id) ? p.filter(x => x !== r.e.id) : [...p, r.e.id])}/></td>
              <td className="py-3"><div className="flex items-center gap-3"><Avatar src={r.e.avatarUrl} name={r.e.name} size="sm"/><div><p className="font-semibold text-slate-800">{r.e.name}</p><p className="text-xs text-slate-500">{r.e.id} · {r.e.position}</p></div></div></td>
              <td className="py-3 text-xs text-slate-600">{r.e.department}</td>
              {r.levels.map((l, i) => <td key={i} className="py-3">{l === undefined ? <span className="text-xs text-slate-400">ไม่มีสกิลนี้</span> : <span className="inline-flex items-center gap-2"><LevelBadge level={l}/><span className={`hidden rounded-md px-1.5 py-0.5 text-[11px] xl:inline ${levelTone[l]}`}>{LEVEL_LABELS[l]}</span></span>}</td>)}
              <td className="space-y-1 py-3 text-xs">{!r.full && <p className="font-semibold text-amber-700">ใกล้ถึงเกณฑ์ · พิจารณาอบรมเพิ่ม</p>}{r.duty && <p className="flex items-center gap-1 text-emerald-700"><UserCheck size={12}/>ได้รับมอบหมายสกิลนี้ในหน้างาน</p>}
                {active.some((c, i) => pendingKeys.has(`${r.e.id}|${c.wi}_${c.type}`) && r.levels[i] !== undefined) && <p className="text-blue-700">มีคำขอปรับคะแนนรอ Manager ยืนยัน</p>}
                {active.flatMap(c => lmsCerts(r.e, c)).map(k => k && <p key={k.id} className="text-slate-600">ผ่านอบรมออนไลน์: {k.title}</p>)}</td></tr>)}</tbody></table></div>{bar}</>}</Paged>}
      </section></>}
  </div>;
}
