import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, ClipboardPaste, Copy, Plus, Trash2, X } from 'lucide-react';
import { parseQuestionText } from '../../data/lmsContent';
import { QUESTION_TYPES, changeQuestionType, emptyQuestion, moveItem, uid } from '../../data/lmsCore';
import type { Question, QuestionType } from '../../data/lmsCore';
import { buttonClass, inputClass } from '../Phase1Shared';
import { ImagePicker } from './useMedia';

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30';
const TYPE_HINT: Record<QuestionType, string> = { single: 'ผู้เรียนเลือกได้ 1 ข้อ', multiple: 'ผู้เรียนเลือกได้หลายข้อ', truefalse: 'ตอบว่า ถูก หรือ ผิด', short: 'ผู้เรียนพิมพ์คำตอบสั้นๆ' };
const MAX_CHOICES = 8;

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700"><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.15rem]' : 'left-0.5'}`}/></button><span onClick={() => onChange(!checked)}>{label}{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span></label>;
}

function QuestionCard({ q, index, count, open, onToggle, onChange, onMove, onDelete, onCopy }: {
  q: Question; index: number; count: number; open: boolean; onToggle: () => void;
  onChange: (q: Question) => void; onMove: (d: -1 | 1) => void; onDelete: () => void; onCopy: () => void;
}) {
  const isChoice = q.type === 'single' || q.type === 'multiple';
  const toggleCorrect = (i: number) => onChange({ ...q, correct: q.type === 'single' ? [i] : q.correct.includes(i) ? q.correct.filter(x => x !== i) : [...q.correct, i].sort((a, b) => a - b) });
  const setChoice = (i: number, text: string) => onChange({ ...q, choices: q.choices.map((c, k) => k === i ? text : c) });
  const setChoiceImage = (i: number, v?: string) => { const imgs = [...(q.choiceImages ?? q.choices.map(() => ''))]; imgs[i] = v ?? ''; onChange({ ...q, choiceImages: imgs }); };
  const removeChoice = (i: number) => onChange({ ...q, choices: q.choices.filter((_, k) => k !== i), choiceImages: q.choiceImages?.filter((_, k) => k !== i), correct: q.correct.filter(k => k !== i).map(k => k > i ? k - 1 : k) });
  const summary = q.text.trim() || (q.image ? '(คำถามเป็นรูปภาพ)' : '(ยังไม่ได้ใส่คำถาม)');
  const incomplete = !(q.text.trim() || q.image) || (isChoice && (q.correct.length === 0 || q.choices.filter((c, i) => c.trim() || q.choiceImages?.[i]).length < 2)) || (q.type === 'short' && !(q.accepted ?? []).some(a => a.trim()));

  return <section className={`rounded-2xl border bg-white shadow-sm ${open ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`} aria-label={`ข้อสอบข้อ ${index + 1}`}>
    <div className="flex flex-wrap items-center gap-3 p-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{index + 1}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{summary}</span><span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">{QUESTION_TYPES[q.type]} · {q.points} คะแนน{incomplete && <span className="font-semibold text-amber-700">· ยังไม่สมบูรณ์</span>}</span></span>
        <ChevronDown size={16} className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}/></button>
      <div className="flex gap-1">
        <button type="button" className={iconBtn} aria-label="เลื่อนข้อสอบขึ้น" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={14}/></button>
        <button type="button" className={iconBtn} aria-label="เลื่อนข้อสอบลง" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14}/></button>
        <button type="button" className={iconBtn} aria-label="ทำสำเนาข้อสอบ" onClick={onCopy}><Copy size={14}/></button>
        <button type="button" className={`${iconBtn} text-red-600`} aria-label="ลบข้อสอบ" onClick={onDelete}><Trash2 size={14}/></button></div>
    </div>
    {open && <div className="space-y-5 border-t border-slate-100 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <fieldset><legend className="mb-1.5 text-xs font-medium text-slate-600">ชนิดคำถาม</legend><div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="ชนิดคำถาม">{(Object.keys(QUESTION_TYPES) as QuestionType[]).map(t => <button key={t} type="button" role="radio" aria-checked={q.type === t} onClick={() => onChange(changeQuestionType(q, t))} className={`rounded-lg border px-3 py-1.5 text-sm ${q.type === t ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{QUESTION_TYPES[t]}</button>)}</div></fieldset>
        <label className="text-xs font-medium text-slate-600">คะแนนข้อนี้<input type="number" min={0.5} max={100} step={0.5} className={`${inputClass} mt-1.5 w-28`} value={q.points} onChange={e => onChange({ ...q, points: Number(e.target.value) })}/></label>
      </div>
      <p className="-mt-2 text-xs text-slate-500">{TYPE_HINT[q.type]}</p>

      <div className="space-y-2"><label className="text-sm font-medium text-slate-700" htmlFor={`${q.id}-text`}>คำถาม</label>
        <textarea id={`${q.id}-text`} rows={2} className={inputClass} value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} placeholder="พิมพ์คำถาม (หรือใส่รูปภาพอย่างเดียวก็ได้)"/>
        <ImagePicker label={`รูปประกอบคำถามข้อ ${index + 1}`} value={q.image} onChange={v => onChange({ ...q, image: v })}/></div>

      {isChoice && <fieldset className="space-y-2.5"><legend className="mb-1 text-sm font-medium text-slate-700">ตัวเลือก <span className="text-xs font-normal text-slate-500">· {q.type === 'single' ? 'กดวงกลมเพื่อกำหนดคำตอบที่ถูก' : 'กดช่องสี่เหลี่ยมเพื่อกำหนดคำตอบที่ถูก (เลือกได้หลายข้อ)'}</span></legend>
        {q.choices.map((c, i) => { const right = q.correct.includes(i); return <div key={i} className={`rounded-xl border-2 p-3 ${right ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <button type="button" role={q.type === 'single' ? 'radio' : 'checkbox'} aria-checked={right} aria-label={`ตัวเลือก ${i + 1} เป็นคำตอบที่ถูก`} onClick={() => toggleCorrect(i)} className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 ${q.type === 'single' ? 'rounded-full' : 'rounded-md'} ${right ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-emerald-500'}`}><Check size={15}/></button>
            <input aria-label={`ตัวเลือก ${i + 1}`} className={inputClass} value={c} onChange={e => setChoice(i, e.target.value)} placeholder={`ตัวเลือก ${i + 1}`}/>
            {q.choices.length > 2 && <button type="button" className={`${iconBtn} shrink-0 text-red-600`} aria-label={`ลบตัวเลือก ${i + 1}`} onClick={() => removeChoice(i)}><X size={14}/></button>}</div>
          <div className="mt-2 pl-10"><ImagePicker compact label={`รูปของตัวเลือก ${i + 1}`} value={q.choiceImages?.[i] || undefined} onChange={v => setChoiceImage(i, v)}/></div></div>; })}
        {q.choices.length < MAX_CHOICES && <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline" onClick={() => onChange({ ...q, choices: [...q.choices, ''], choiceImages: q.choiceImages ? [...q.choiceImages, ''] : undefined })}><Plus size={15}/>เพิ่มตัวเลือก</button>}
      </fieldset>}

      {q.type === 'truefalse' && <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">คำตอบที่ถูกต้อง</legend><div className="grid max-w-md grid-cols-2 gap-3">{['ถูก', 'ผิด'].map((label, i) => <button key={label} type="button" role="radio" aria-checked={q.correct[0] === i} onClick={() => onChange({ ...q, correct: [i] })} className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold ${q.correct[0] === i ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{q.correct[0] === i && <CheckCircle2 size={16}/>}{label}</button>)}</div></fieldset>}

      {q.type === 'short' && <fieldset className="space-y-2"><legend className="mb-1 text-sm font-medium text-slate-700">คำตอบที่ยอมรับ <span className="text-xs font-normal text-slate-500">· ไม่สนตัวพิมพ์ใหญ่เล็กและช่องว่างหัวท้าย ใส่ได้หลายรูปแบบ</span></legend>
        {(q.accepted ?? ['']).map((a, i, all) => <div key={i} className="flex items-center gap-2"><input aria-label={`คำตอบที่ยอมรับ ${i + 1}`} className={inputClass} value={a} onChange={e => onChange({ ...q, accepted: all.map((x, k) => k === i ? e.target.value : x) })}/>{all.length > 1 && <button type="button" className={`${iconBtn} text-red-600`} aria-label={`ลบคำตอบที่ยอมรับ ${i + 1}`} onClick={() => onChange({ ...q, accepted: all.filter((_, k) => k !== i) })}><X size={14}/></button>}</div>)}
        <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline" onClick={() => onChange({ ...q, accepted: [...(q.accepted ?? []), ''] })}><Plus size={15}/>เพิ่มคำตอบที่ยอมรับ</button></fieldset>}

      <div className="space-y-3 rounded-xl bg-slate-50 p-4">
        {isChoice && <Switch checked={q.shuffle !== false} onChange={v => onChange({ ...q, shuffle: v })} label="สลับลำดับตัวเลือกทุกครั้งที่สอบ" hint="ปิดเมื่อมีตัวเลือกอย่าง “ถูกทุกข้อ” หรือ “ข้อ ก และ ข”"/>}
        {q.type === 'multiple' && <Switch checked={!!q.partial} onChange={v => onChange({ ...q, partial: v })} label="ให้คะแนนบางส่วน" hint="ปิด = ต้องเลือกถูกครบและไม่เลือกผิดจึงได้คะแนนเต็ม · เปิด = ได้ตามสัดส่วน (เลือกผิดหักคะแนน)"/>}
        <div><label className="text-sm font-medium text-slate-700" htmlFor={`${q.id}-exp`}>คำอธิบายเฉลย <span className="text-xs font-normal text-slate-500">(แสดงหลังส่งคำตอบ)</span></label><input id={`${q.id}-exp`} className={`${inputClass} mt-1.5`} value={q.explanation} onChange={e => onChange({ ...q, explanation: e.target.value })}/></div>
      </div>
    </div>}
  </section>;
}

const IMPORT_SAMPLE = `พบรอยร้าวที่แนวเชื่อมต้องทำอย่างไร
a) เจียรแล้วส่งต่อ
*b) แยกชิ้นงานและออก NC
c) บันทึกแล้วใช้ต่อ
อธิบาย: รอยร้าวไม่ยอมรับทุกขนาด

ข้อใดต้องตรวจก่อนเริ่มงาน (เลือกได้หลายข้อ)
*a) แสงสว่าง
*b) ความสะอาดของแนวเชื่อม
c) สีของชิ้นงาน
คะแนน: 2

ความสว่างขั้นต่ำกี่ลักซ์
ตอบ: 500 | 500 ลักซ์`;

/** วางข้อความหลายข้อแล้วแปลงเป็นข้อสอบในครั้งเดียว */
function BulkImport({ onAdd, onClose }: { onAdd: (q: Question[]) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const result = parseQuestionText(text);
  return <section className="space-y-3 rounded-2xl border border-blue-300 bg-white p-4" aria-label="นำเข้าข้อสอบจากข้อความ">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">นำเข้าข้อสอบจากข้อความ</h3><button type="button" className="text-xs font-semibold text-blue-700 hover:underline" onClick={() => setText(IMPORT_SAMPLE)}>ใส่ตัวอย่าง</button></div>
    <p className="text-xs leading-5 text-slate-500">คั่นแต่ละข้อด้วยบรรทัดว่าง · ใส่ * หน้าตัวเลือกที่ถูก (หลายข้อได้) · "ตอบ:" สำหรับคำตอบสั้น · "อธิบาย:" และ "คะแนน:" ใส่หรือไม่ก็ได้</p>
    <textarea rows={10} aria-label="ข้อความข้อสอบ" className={inputClass} value={text} onChange={e => setText(e.target.value)} placeholder={IMPORT_SAMPLE}/>
    {result.errors.length > 0 && <ul className="list-disc pl-5 text-xs text-red-700">{result.errors.map(e => <li key={e}>{e}</li>)}</ul>}
    <div className="flex flex-wrap items-center gap-2"><button type="button" className={buttonClass} disabled={!result.questions.length || result.errors.length > 0} onClick={() => { onAdd(result.questions); onClose(); }}>เพิ่ม {result.questions.length} ข้อ</button><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" onClick={onClose}>ยกเลิก</button>
      {result.questions.length > 0 && <span className="text-xs text-slate-500">{result.questions.map(q => QUESTION_TYPES[q.type]).join(' · ')}</span>}</div>
  </section>;
}

export default function QuestionBuilder({ questions, passScore, questionsPerExam, onChange }: { questions: Question[]; passScore: number; questionsPerExam: number; onChange: (q: Question[]) => void }) {
  const [open, setOpen] = useState(questions[0]?.id ?? ''); const [importing, setImporting] = useState(false);
  const total = questions.reduce((n, q) => n + (q.points || 0), 0);
  const add = (type: QuestionType) => { const q = emptyQuestion(type); onChange([...questions, q]); setOpen(q.id); };
  const addBtn = 'inline-flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-2 text-sm text-blue-700 hover:bg-blue-50';
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>คลังข้อสอบ <strong>{questions.length}</strong> ข้อ</span><span>คะแนนเต็มรวม <strong>{total}</strong></span><span>ผ่านเมื่อได้ ≥ <strong>{Math.ceil(total * passScore / 100 * 100) / 100}</strong> คะแนน ({passScore}%)</span><span className="text-blue-700">{questionsPerExam > 0 ? `สุ่มสอบครั้งละ ${Math.min(questionsPerExam, questions.length)} ข้อ (คะแนนรวมแต่ละครั้งตามข้อที่สุ่มได้)` : 'ใช้ทุกข้อในการสอบ'}</span>
      {questions.length > 0 && <button type="button" className="ml-auto text-xs font-semibold text-blue-700 hover:underline" onClick={() => { const v = Number(window.prompt('ตั้งคะแนนเท่ากันทุกข้อเป็นกี่คะแนน?', '1')); if (v > 0 && v <= 100) onChange(questions.map(q => ({ ...q, points: v }))); }}>ตั้งคะแนนทุกข้อพร้อมกัน</button>}</div>
    {questions.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">ยังไม่มีข้อสอบ เริ่มจากเพิ่มข้อแรกด้านล่าง</p>}
    {questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} count={questions.length} open={open === q.id} onToggle={() => setOpen(open === q.id ? '' : q.id)}
      onChange={x => onChange(questions.map(k => k.id === q.id ? x : k))} onMove={d => onChange(moveItem(questions, i, d))}
      onDelete={() => { if (window.confirm(`ลบข้อสอบข้อที่ ${i + 1}?`)) onChange(questions.filter(k => k.id !== q.id)); }}
      onCopy={() => { const copy = { ...q, id: uid('Q'), choices: [...q.choices], choiceImages: q.choiceImages ? [...q.choiceImages] : undefined, correct: [...q.correct], accepted: q.accepted ? [...q.accepted] : undefined }; onChange([...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)]); setOpen(copy.id); }}/>)}
    {importing && <BulkImport onAdd={added => { onChange([...questions, ...added]); setOpen(added[0].id); }} onClose={() => setImporting(false)}/>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="เพิ่มข้อสอบ">
      <button type="button" className={`${addBtn} border-solid font-semibold`} onClick={() => setImporting(true)}><ClipboardPaste size={15}/>นำเข้าหลายข้อจากข้อความ</button>{(Object.keys(QUESTION_TYPES) as QuestionType[]).map(t => <button key={t} type="button" className={addBtn} onClick={() => add(t)}><Plus size={15}/>เพิ่ม: {QUESTION_TYPES[t]}</button>)}</div>
  </div>;
}
