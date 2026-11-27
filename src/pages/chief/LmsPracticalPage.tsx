import { Can } from '../../components/Permission';
import { Paged } from '../../components/Paged';
import { useState } from 'react';
import { LEVEL_LABELS, SKILL_WIS } from '../../data/phase1Core';
import { useSkillState } from '../../data/phase1Store';
import { chiefTeam, lmsActions, useLms } from '../../data/lmsStore';
import { bkkDate, PRACTICAL_PASS } from '../../data/lmsCore';
import type { PracticalStage } from '../../data/lmsCore';
import { practicalQueue } from '../../data/lmsPractical';
import type { PracticalItem } from '../../data/lmsPractical';
import { buttonClass, EmptyState, Field, inputClass, Metric, panelClass } from '../../components/Phase1Shared';
import { RolePageIntro } from '../../components/RolePageIntro';
import { formatThaiDate, LevelChip, Pill } from '../../components/lms/LmsShared';

const STAGE: Record<Exclude<PracticalStage, 'none'>, { label: string; tone: 'slate' | 'blue' | 'amber' | 'green' | 'red' }> = {
  evaluate: { label: 'รอประเมินหน้างาน', tone: 'amber' }, failed: { label: 'ปฏิบัติยังไม่ผ่าน · ประเมินใหม่ได้', tone: 'red' },
  propose: { label: 'ผ่านปฏิบัติ · รอเสนอปรับระดับ', tone: 'blue' }, 'waiting-manager': { label: 'รอ Manager ยืนยัน', tone: 'slate' },
  rejected: { label: 'Manager ยังไม่ยืนยันถึงเป้า · ประเมินใหม่ได้', tone: 'red' }, done: { label: 'ถึงระดับเป้าหมายแล้ว', tone: 'green' },
};

function Card({ item, onResult }: { item: PracticalItem; onResult: (message: string) => void }) {
  const { e, c, level, stage, adjustment } = item;
  const [score, setScore] = useState(''); const [date, setDate] = useState(bkkDate()); const [note, setNote] = useState(''); const [error, setError] = useState('');
  const wi = SKILL_WIS.find(w => w.code === c.wiCode); const type = wi?.types.find(t => t.code === c.skillType);
  const canEvaluate = stage === 'evaluate' || stage === 'failed' || stage === 'rejected';
  const examScore = Math.max(...e.attempts.map(a => a.score), 0);
  function save(event: React.FormEvent) {
    event.preventDefault(); setError('');
    try { if (!score.trim()) throw new Error('กรอกคะแนนปฏิบัติ'); lmsActions.recordPractical(e.id, { score: Number(score), note, observedOn: date }); onResult(Number(score) >= PRACTICAL_PASS ? `บันทึกว่า ${e.employeeName} ผ่านประเมินหน้างานแล้ว เสนอปรับระดับสกิลได้` : `บันทึกว่า ${e.employeeName} ยังไม่ผ่านประเมินหน้างาน`); setScore(''); setNote(''); }
    catch (x) { setError((x as Error).message); }
  }
  function propose() {
    setError('');
    try { lmsActions.proposeSkill(e.id); onResult(`ส่งข้อเสนอปรับ ${e.employeeName} เป็น Lv ${c.skillToLevel} ให้ Manager ยืนยันแล้ว`); }
    catch (x) { setError((x as Error).message); }
  }
  return <article className={`${panelClass} space-y-4 p-5`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-800">{e.employeeName}</h2><p className="text-xs text-slate-500">{e.employeeId} · สอบออนไลน์ {examScore}% · {e.certificateNo}</p></div>{stage !== 'none' && <Pill tone={STAGE[stage].tone}>{STAGE[stage].label}</Pill>}</div>
    <div className="rounded-lg bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-900">{c.title}</p>
      <p className="text-xs text-blue-800">{c.wiCode} · {wi?.name.replace(/\s*\(.*\)$/, '')} · ประเภท {c.skillType}{type ? ` ${type.label}` : ''}</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">ระดับปัจจุบัน <LevelChip level={level}/> → เป้าหมาย <LevelChip level={c.skillToLevel}/> {LEVEL_LABELS[c.skillToLevel]}</p></div>
    {e.practical && <div className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-semibold text-slate-800">ผลประเมินหน้างานล่าสุด: <span className={e.practical.passed ? 'text-emerald-700' : 'text-red-700'}>{e.practical.score}% · {e.practical.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span></p><p className="text-xs text-slate-500">สังเกตการณ์ {formatThaiDate(e.practical.observedOn)} · {e.practical.evaluatedBy}</p><p className="mt-1 text-slate-600">{e.practical.note}</p></div>}
    {stage === 'rejected' && adjustment && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{adjustment.status === 'approved' ? `Manager อนุมัติเป็นระดับต่ำกว่าเป้าหมาย (Lv ${level})` : 'Manager ไม่อนุมัติ'}{adjustment.remark ? ` · เหตุผล: ${adjustment.remark}` : ''}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {canEvaluate && <Can id="queue" action="create"><form onSubmit={save} className="space-y-3 border-t border-blue-100 pt-4"><p className="text-sm font-semibold text-slate-800">บันทึกผลสังเกตการปฏิบัติงานจริง (ผ่านที่ {PRACTICAL_PASS}%)</p>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="คะแนนปฏิบัติ (0–100)"><input type="number" min={0} max={100} className={inputClass} value={score} onChange={x => setScore(x.target.value)}/></Field>
        <Field label="วันที่สังเกตการปฏิบัติ"><input type="date" max={bkkDate()} min={e.passedAt ? bkkDate(new Date(e.passedAt)) : undefined} className={inputClass} value={date} onChange={x => setDate(x.target.value)}/></Field></div>
      <Field label="สิ่งที่สังเกต / หลักฐานอ้างอิง"><textarea rows={2} className={inputClass} value={note} onChange={x => setNote(x.target.value)} placeholder="เช่น ปฏิบัติตาม W/I ครบ ตรวจชิ้นงาน 10 ชิ้นไม่พบข้อผิดพลาด"/></Field>
      <button className={buttonClass}>บันทึกผลประเมินหน้างาน</button></form></Can>}
    {stage === 'propose' && <Can id="queue" action="create"><div className="flex flex-wrap items-center gap-3 border-t border-blue-100 pt-4"><button className={buttonClass} onClick={propose}>เสนอปรับระดับสกิลเป็น Lv {c.skillToLevel}</button><span className="text-xs text-slate-500">ส่งเข้าคิว Manager · คะแนนสกิลจะเปลี่ยนเมื่อ Manager ยืนยันเท่านั้น</span></div></Can>}
  </article>;
}

export default function ChiefLmsPracticalPage() {
  const lms = useLms(); const skill = useSkillState(); const [message, setMessage] = useState('');
  const items = practicalQueue(lms, skill, new Set(chiefTeam(skill).map(t => t.id)));
  const todo = items.filter(i => ['evaluate', 'failed', 'propose', 'rejected'].includes(i.stage));
  const rest = items.filter(i => !todo.includes(i));
  const count = (s: PracticalStage) => items.filter(i => i.stage === s).length;
  return <div className="space-y-6">
    <Can id="header"><RolePageIntro title="ประเมินหน้างานหลังเรียน" description="สอบออนไลน์วัดความรู้ ส่วนระดับสกิลต้องดูจากการปฏิบัติจริง · ประเมินลูกทีมตรงที่รับรองผลสอบแล้ว จึงเสนอปรับระดับสกิล" steps={['สังเกตการปฏิบัติงานจริงตาม W/I', 'บันทึกคะแนนและหลักฐาน', 'ผ่านแล้วเสนอให้ Manager ยืนยันระดับ']}/></Can>
    <Can id="metrics"><div className="grid gap-4 md:grid-cols-4"><Metric label="รอประเมินหน้างาน" value={count('evaluate') + count('failed') + count('rejected')}/><Metric label="รอเสนอปรับระดับ" value={count('propose')}/><Metric label="รอ Manager ยืนยัน" value={count('waiting-manager')}/><Metric label="ถึงเป้าหมายแล้ว" value={count('done')}/></div></Can>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {todo.length === 0 ? <Can id="queue"><EmptyState>ไม่มีรายการที่ต้องประเมินหรือเสนอปรับระดับ</EmptyState></Can> : <Can id="queue"><Paged items={todo} size={6} sizes={[6, 12, 24]} boxed>{({ rows, bar }) => <><div className="grid items-start gap-4 xl:grid-cols-2">{rows.map(i => <Card key={i.e.id} item={i} onResult={setMessage}/>)}</div>{bar}</>}</Paged></Can>}
    {rest.length > 0 && <Can id="done"><section className="space-y-3"><h2 className="font-bold text-slate-800">ดำเนินการแล้ว</h2><Paged items={rest} size={6} sizes={[6, 12, 24]} boxed>{({ rows, bar }) => <><div className="grid items-start gap-4 xl:grid-cols-2">{rows.map(i => <Card key={i.e.id} item={i} onResult={setMessage}/>)}</div>{bar}</>}</Paged></section></Can>}
  </div>;
}
