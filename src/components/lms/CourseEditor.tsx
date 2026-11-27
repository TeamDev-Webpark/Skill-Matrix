import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, FileText, PlayCircle, Plus, Trash2, Upload } from 'lucide-react';
import { LEVEL_LABELS, SKILL_DEPARTMENTS, SKILL_WIS } from '../../data/phase1Core';
import { COURSE_CATEGORIES, emptyCheckpoint, emptyLesson, moveItem, validateCourse } from '../../data/lmsCore';
import type { Checkpoint, Course, Lesson } from '../../data/lmsCore';
import { MAX_VIDEO_MB, readVideoDuration, saveMedia, validateVideoFile } from '../../data/lmsMedia';
import QuestionBuilder from './QuestionBuilder';
import ArticleEditor from './ArticleEditor';
import { AttachmentEditor } from './Attachments';
import { useMediaUrl } from './useMedia';
import { buttonClass, Field, inputClass, panelClass } from '../Phase1Shared';
import { CourseStatusBadge } from './LmsShared';
import { parseVideoSource } from './videoSource';

const TABS = [['info', 'ข้อมูลหลักสูตร'], ['lessons', 'บทเรียน'], ['exam', 'แบบทดสอบ'], ['rules', 'เกณฑ์และเงื่อนไข']] as const;
const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white text-slate-600 hover:bg-blue-50 disabled:opacity-30';

function Toolbar({ index, count, onMove, onDelete, onCopy, label }: { index: number; count: number; onMove: (d: -1 | 1) => void; onDelete: () => void; onCopy?: () => void; label: string }) {
  return <div className="flex gap-1">
    <button type="button" className={iconBtn} aria-label={`เลื่อน${label}ขึ้น`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={14}/></button>
    <button type="button" className={iconBtn} aria-label={`เลื่อน${label}ลง`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14}/></button>
    {onCopy && <button type="button" className={iconBtn} aria-label={`ทำสำเนา${label}`} onClick={onCopy}><Copy size={14}/></button>}
    <button type="button" className={`${iconBtn} text-red-600`} aria-label={`ลบ${label}`} onClick={onDelete}><Trash2 size={14}/></button></div>;
}

function CheckpointEditor({ cp, index, count, onChange, onMove, onDelete }: { cp: Checkpoint; index: number; count: number; onChange: (c: Checkpoint) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  return <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-blue-800">จุดคำถามที่ {index + 1}</p><Toolbar index={index} count={count} onMove={onMove} onDelete={onDelete} label="จุดคำถาม"/></div>
    <div className="grid gap-2 sm:grid-cols-[8rem_1fr]"><Field label="วินาทีที่หยุดถาม"><input type="number" min={0} className={inputClass} value={cp.timeSec} onChange={e => onChange({ ...cp, timeSec: Math.max(0, Number(e.target.value) || 0) })}/></Field>
      <Field label="คำถาม"><input className={inputClass} value={cp.question} onChange={e => onChange({ ...cp, question: e.target.value })}/></Field></div>
    {cp.choices.map((ch, i) => <div key={i} className="flex items-center gap-2"><input type="radio" name={`${cp.id}-ans`} aria-label={`ตัวเลือก ${i + 1} เป็นคำตอบที่ถูก`} checked={cp.answerIndex === i} onChange={() => onChange({ ...cp, answerIndex: i })}/><input aria-label={`ตัวเลือก ${i + 1}`} className={inputClass} value={ch} onChange={e => onChange({ ...cp, choices: cp.choices.map((x, k) => k === i ? e.target.value : x) })}/></div>)}
    <Field label="คำอธิบายหลังตอบ (ไม่บังคับ)"><input className={inputClass} value={cp.explanation ?? ''} onChange={e => onChange({ ...cp, explanation: e.target.value })}/></Field></div>;
}

function VideoSettings({ lesson, onChange }: { lesson: Lesson; onChange: (l: Lesson) => void }) {
  const isFile = !!lesson.videoUrl?.startsWith('idb:');
  const [mode, setMode] = useState<'file' | 'link'>(isFile || !lesson.videoUrl?.trim() ? 'file' : 'link');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const media = useMediaUrl(isFile ? lesson.videoUrl : undefined);
  const src = !isFile && lesson.videoUrl?.trim() ? parseVideoSource(lesson.videoUrl) : null;
  async function upload(file?: File) {
    if (!file) return; setError(''); setBusy(true);
    try {
      validateVideoFile(file); const sec = await readVideoDuration(file); const ref = await saveMedia(file, file.name);
      onChange({ ...lesson, videoUrl: ref, videoName: file.name, durationMin: Math.max(1, Math.ceil(sec / 60)), checkpoints: lesson.checkpoints.filter(c => c.timeSec < sec) });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const tab = (id: 'file' | 'link', label: string) => <button type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-sm ${mode === id ? 'bg-blue-600 font-semibold text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>;
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">วิดีโอบทเรียน</p><div role="tablist" className="flex gap-2">{tab('file', 'อัปโหลดไฟล์')}{tab('link', 'ลิงก์วิดีโอ')}</div></div>
    {mode === 'file' ? <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white p-6 text-center hover:bg-blue-50"><Upload size={22} className="text-blue-600"/><span className="text-sm font-semibold text-slate-800">{busy ? 'กำลังบันทึกไฟล์…' : isFile ? 'เปลี่ยนไฟล์วิดีโอ' : 'เลือกไฟล์วิดีโอจากเครื่อง'}</span><span className="text-xs text-slate-500">.mp4 (H.264) .webm .ogg .mov · ไม่เกิน {MAX_VIDEO_MB} MB · เก็บในเบราว์เซอร์นี้</span>
        <input type="file" accept="video/*,.mp4,.webm,.ogg,.mov,.m4v" className="sr-only" disabled={busy} aria-label="อัปโหลดไฟล์วิดีโอ" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/></label>
      {isFile && <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate font-medium text-slate-800">{lesson.videoName || 'วิดีโอที่อัปโหลด'}</span><button type="button" className="text-xs font-semibold text-red-700 hover:underline" onClick={() => onChange({ ...lesson, videoUrl: '', videoName: undefined, checkpoints: [] })}>ลบวิดีโอ</button></div>
        {media.url ? <video src={media.url} controls preload="metadata" className="max-h-64 w-full rounded-lg bg-black" aria-label="ตัวอย่างวิดีโอที่อัปโหลด"/> : <p className="text-xs text-slate-500">{media.failed ? 'ไม่พบไฟล์ในเบราว์เซอร์นี้ กรุณาอัปโหลดใหม่' : 'กำลังโหลดตัวอย่าง…'}</p>}
        <p className="text-xs text-slate-500">ความยาวตั้งตามไฟล์อัตโนมัติ ({lesson.durationMin} นาที) · วิดีโอเก็บเฉพาะในเบราว์เซอร์ที่อัปโหลด (ยังไม่มีเซิร์ฟเวอร์กลาง)</p></div>}
    </div> : <div className="space-y-2"><Field label="ลิงก์วิดีโอ (YouTube / ไฟล์ .mp4 .webm / Vimeo / Google Drive)"><input className={inputClass} value={isFile ? '' : lesson.videoUrl ?? ''} onChange={e => onChange({ ...lesson, videoUrl: e.target.value, videoName: undefined })} placeholder="https://www.youtube.com/watch?v=…"/></Field>
      {!isFile && lesson.videoUrl?.trim() ? (src ? <p className="text-xs text-emerald-700">รองรับลิงก์นี้ · {src.kind === 'embed' ? `${src.label}: ติดตามการดูอัตโนมัติไม่ได้ จะบังคับเวลาขั้นต่ำแทน` : 'ตรวจการดูจริง กันกรอข้าม และหยุดถามที่จุดคำถามได้'}</p> : <p className="text-xs text-red-700">ลิงก์ไม่ถูกต้องหรือไม่รองรับ</p>) : null}</div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {mode === 'link' && src?.kind === 'embed' ? <Field label="เวลาขั้นต่ำที่ต้องอยู่ในบทเรียน (วินาที)"><input type="number" min={0} className={`${inputClass} max-w-40`} value={lesson.minSeconds} onChange={e => onChange({ ...lesson, minSeconds: Math.max(0, Number(e.target.value) || 0) })}/></Field>
      : <Field label="ต้องดูจริงอย่างน้อย (% ของความยาววิดีโอ)"><input type="number" min={50} max={100} className={`${inputClass} max-w-40`} value={lesson.requiredWatchPct ?? 90} onChange={e => onChange({ ...lesson, requiredWatchPct: Math.min(100, Math.max(50, Number(e.target.value) || 90)) })}/></Field>}
    <p className="text-xs leading-5 text-slate-500">ระบบนับเฉพาะวินาทีที่เล่นจริงขณะอยู่ในหน้าเรียน · กรอข้ามไม่ได้ · ใช้ความเร็ว 1x จนกว่าจะเรียนจบ · ตอบจุดคำถามครบจึงนับว่าจบ</p>
  </div>;
}

function LessonEditor({ lesson, index, count, open, onToggle, onChange, onMove, onDelete }: { lesson: Lesson; index: number; count: number; open: boolean; onToggle: () => void; onChange: (l: Lesson) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const src = lesson.type === 'video' && lesson.videoUrl?.trim() ? parseVideoSource(lesson.videoUrl) : null;
  return <div className={`${panelClass} p-4`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center gap-2 text-left font-semibold text-slate-800">{lesson.type === 'video' ? <PlayCircle size={16} className="text-blue-600"/> : <FileText size={16} className="text-blue-600"/>}{index + 1}. {lesson.title || '(ยังไม่ตั้งชื่อ)'}<span className="text-xs font-normal text-slate-500">{lesson.type === 'video' ? 'วิดีโอ' : 'บทความ'} · {lesson.durationMin} นาที{lesson.attachments?.length ? ` · แนบ ${lesson.attachments.length} ไฟล์` : ''}</span></button>
      <Toolbar index={index} count={count} onMove={onMove} onDelete={onDelete} label="บทเรียน"/></div>
    {open && <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_8rem_8rem]"><Field label="ชื่อบทเรียน"><input className={inputClass} value={lesson.title} onChange={e => onChange({ ...lesson, title: e.target.value })}/></Field>
        <Field label="ความยาว (นาที)"><input type="number" min={1} className={inputClass} value={lesson.durationMin} onChange={e => onChange({ ...lesson, durationMin: Math.max(1, Number(e.target.value) || 1) })}/></Field>
        <Field label="ชนิด"><select className={inputClass} value={lesson.type} onChange={e => { const type = e.target.value as Lesson['type']; onChange({ ...lesson, type, minSeconds: type === 'article' ? Math.max(lesson.minSeconds, 30) : 0 }); }}><option value="article">บทความ</option><option value="video">วิดีโอ</option></select></Field></div>
      {lesson.type === 'video' && <VideoSettings lesson={lesson} onChange={onChange}/>}
      <Field label="วัตถุประสงค์ (บรรทัดละ 1 ข้อ)"><textarea rows={3} className={inputClass} value={lesson.objectives.join('\n')} onChange={e => onChange({ ...lesson, objectives: e.target.value.split('\n') })} onBlur={e => onChange({ ...lesson, objectives: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })}/></Field>
      <ArticleEditor key={lesson.id} label={lesson.type === 'article' ? 'เนื้อหาบทความ' : 'เนื้อหาประกอบวิดีโอ (ไม่บังคับ)'} rows={lesson.type === 'article' ? 12 : 4} value={lesson.body} onChange={body => onChange({ ...lesson, body })}/>
      <AttachmentEditor files={lesson.attachments ?? []} onChange={attachments => onChange({ ...lesson, attachments })}/>
      {lesson.type === 'article' && !!lesson.attachments?.some(a => a.kind === 'pdf') && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!lesson.requireOpen} onChange={e => onChange({ ...lesson, requireOpen: e.target.checked })}/>ผู้เรียนต้องเปิดอ่าน PDF ครบทุกไฟล์ก่อนกดจบบทเรียน</label>}
      {lesson.type === 'article' && <Field label="เวลาขั้นต่ำที่ต้องอ่าน (วินาที)"><input type="number" min={0} className={`${inputClass} max-w-40`} value={lesson.minSeconds} onChange={e => onChange({ ...lesson, minSeconds: Math.max(0, Number(e.target.value) || 0) })}/></Field>}
      {lesson.type === 'video' && <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">จุดคำถามระหว่างวิดีโอ ({lesson.checkpoints.length})</p><button type="button" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline" onClick={() => onChange({ ...lesson, checkpoints: [...lesson.checkpoints, emptyCheckpoint((lesson.checkpoints.at(-1)?.timeSec ?? 0) + 30)] })}><Plus size={14}/>เพิ่มจุดคำถาม</button></div>
        {lesson.checkpoints.map((cp, i) => <CheckpointEditor key={cp.id} cp={cp} index={i} count={lesson.checkpoints.length} onChange={x => onChange({ ...lesson, checkpoints: lesson.checkpoints.map(k => k.id === cp.id ? x : k) })} onMove={d => onChange({ ...lesson, checkpoints: moveItem(lesson.checkpoints, i, d) })} onDelete={() => onChange({ ...lesson, checkpoints: lesson.checkpoints.filter(k => k.id !== cp.id) })}/>)}</div>}
    </div>}
  </div>;
}

export default function CourseEditor({ initial, courses, isNew, onSave, onPreview, onClose }: {
  initial: Course; courses: Course[]; isNew: boolean;
  onSave: (course: Course, publish: boolean) => void; onPreview: (course: Course) => void; onClose: () => void;
}) {
  const [c, setC] = useState<Course>(structuredClone(initial));
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('info');
  const [open, setOpen] = useState<string>(initial.lessons[0]?.id ?? '');
  const [error, setError] = useState('');
  const set = <K extends keyof Course>(key: K, value: Course[K]) => setC(x => ({ ...x, [key]: value }));
  const issues = validateCourse(c, courses, true);
  const wis = SKILL_WIS.filter(w => c.department === 'ALL' || w.department === c.department);
  const types = SKILL_WIS.find(w => w.code === c.wiCode)?.types ?? [];
  const others = courses.filter(o => o.id !== c.id && o.status !== 'archived');
  function run(publish: boolean) { setError(''); try { onSave(c, publish); } catch (e) { setError((e as Error).message); } }
  const duration = c.lessons.reduce((n, l) => n + l.durationMin, 0);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><button onClick={onClose} className="mb-2 text-sm text-blue-700 hover:underline">← กลับรายการหลักสูตร</button><h1 className="text-2xl font-bold text-slate-800">{isNew ? 'สร้างหลักสูตรใหม่' : 'แก้ไขหลักสูตร'}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><CourseStatusBadge c={c}/>เวอร์ชัน {c.version} · {c.lessons.length} บทเรียน · {duration} นาที · {c.questions.length} ข้อสอบ{c.status === 'published' && ' · แก้เนื้อหาแล้วบันทึกจะออกเวอร์ชันใหม่'}</p></div>
      <div className="flex flex-wrap gap-2"><button className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm hover:bg-blue-50 disabled:opacity-40" disabled={!c.lessons.length} onClick={() => onPreview(c)}><Eye size={16}/>ทดลองเรียน</button>
        <button className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm hover:bg-blue-50" onClick={() => run(false)}>บันทึก{c.status === 'published' ? '' : 'ฉบับร่าง'}</button>
        {c.status !== 'published' && <button className={buttonClass} onClick={() => run(true)}>บันทึกและเผยแพร่</button>}</div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-blue-100">{TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px rounded-t-lg border px-4 py-2 text-sm ${tab === id ? 'border-blue-200 border-b-white bg-white font-semibold text-blue-800' : 'border-transparent text-slate-600 hover:bg-blue-50'}`}>{label}{id === 'lessons' && ` (${c.lessons.length})`}{id === 'exam' && ` (${c.questions.length})`}</button>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-4">
        {tab === 'info' && <div className={`${panelClass} grid gap-4 p-5 md:grid-cols-2`}>
          <Field label="รหัสหลักสูตร"><input className={inputClass} value={c.code} onChange={e => set('code', e.target.value)} placeholder="เช่น LMS-010"/></Field>
          <Field label="หมวดหมู่"><select className={inputClass} value={c.category} onChange={e => set('category', e.target.value)}>{COURSE_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></Field>
          <div className="md:col-span-2"><Field label="ชื่อหลักสูตร"><input className={inputClass} value={c.title} onChange={e => set('title', e.target.value)}/></Field></div>
          <div className="md:col-span-2"><Field label="คำอธิบายหลักสูตร"><textarea rows={3} className={inputClass} value={c.description} onChange={e => set('description', e.target.value)}/></Field></div>
          <Field label="ผู้สอน / เจ้าของเนื้อหา"><input className={inputClass} value={c.instructor} onChange={e => set('instructor', e.target.value)}/></Field>
          <Field label="กลุ่มผู้เรียน (แผนก)"><select className={inputClass} value={c.department} onChange={e => setC(x => ({ ...x, department: e.target.value, wiCode: undefined, skillType: undefined }))}><option value="ALL">ทุกแผนก</option>{SKILL_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
          <fieldset className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:col-span-2"><legend className="px-1 text-sm font-bold text-blue-900">สกิลที่หลักสูตรนี้ช่วยยกระดับ (ไม่บังคับ)</legend>
            <p className="text-xs leading-5 text-slate-500">ผูกหลักสูตรกับ W/I และประเภทสกิล เพื่อให้ระบบแนะนำหลักสูตรให้พนักงานตามระดับปัจจุบัน และให้ Chief เสนอปรับระดับสกิลหลังรับรองผล</p>
            <div><p className="mb-1.5 text-sm font-medium text-slate-600">1. Work Instruction {c.department !== 'ALL' && <span className="text-xs font-normal text-slate-400">(แสดงเฉพาะของ {c.department})</span>}</p>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5" role="radiogroup" aria-label="Work Instruction">
                <button type="button" role="radio" aria-checked={!c.wiCode} onClick={() => setC(x => ({ ...x, wiCode: undefined, skillType: undefined, skillFromLevel: 0, skillToLevel: 0 }))} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!c.wiCode ? 'bg-blue-600 font-semibold text-white' : 'hover:bg-slate-50'}`}>ไม่ผูกกับสกิล</button>
                {wis.map(w => <button key={w.code} type="button" role="radio" aria-checked={c.wiCode === w.code} onClick={() => setC(x => ({ ...x, wiCode: w.code, skillType: undefined, skillFromLevel: x.skillToLevel ? x.skillFromLevel : 1, skillToLevel: x.skillToLevel || 2 }))} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${c.wiCode === w.code ? 'bg-blue-600 font-semibold text-white' : 'hover:bg-slate-50'}`}>{w.code} · {w.name}</button>)}</div></div>
            {c.wiCode && <div><p className="mb-1.5 text-sm font-medium text-slate-600">2. ประเภทสกิล</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ประเภทสกิล">{types.map(t => <button key={t.code} type="button" role="radio" aria-checked={c.skillType === t.code} onClick={() => set('skillType', t.code)} className={`rounded-lg border px-3 py-1.5 text-sm ${c.skillType === t.code ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>{t.code} · {t.label}</button>)}</div></div>}
            {c.wiCode && <div className="grid gap-4 md:grid-cols-2">
              <div><p className="mb-1.5 text-sm font-medium text-slate-600">3. เหมาะกับผู้ที่มีระดับตั้งแต่</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ระดับเริ่มต้น">{[0, 1, 2].map(l => <button key={l} type="button" role="radio" aria-checked={c.skillFromLevel === l} title={LEVEL_LABELS[l]} onClick={() => setC(x => ({ ...x, skillFromLevel: l, skillToLevel: Math.max(x.skillToLevel, l + 1) }))} className={`rounded-lg border px-4 py-1.5 text-sm ${c.skillFromLevel === l ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>Lv {l}</button>)}</div><p className="mt-1 text-xs text-slate-500">{LEVEL_LABELS[c.skillFromLevel]}</p></div>
              <div><p className="mb-1.5 text-sm font-medium text-slate-600">4. ระดับเป้าหมายหลังเรียนจบ</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ระดับเป้าหมาย">{[1, 2, 3].map(l => <button key={l} type="button" role="radio" aria-checked={c.skillToLevel === l} disabled={l <= c.skillFromLevel} title={LEVEL_LABELS[l]} onClick={() => set('skillToLevel', l)} className={`rounded-lg border px-4 py-1.5 text-sm disabled:opacity-40 ${c.skillToLevel === l ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>Lv {l}</button>)}</div><p className="mt-1 text-xs text-slate-500">{LEVEL_LABELS[c.skillToLevel]}</p></div></div>}
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={c.mandatory} onChange={e => set('mandatory', e.target.checked)}/>เป็นหลักสูตรบังคับ (แสดงป้ายหลักสูตรบังคับให้ผู้เรียน)</label>
          <fieldset className="md:col-span-2"><legend className="mb-1 text-sm font-medium text-slate-600">หลักสูตรที่ต้องผ่านก่อน</legend>{others.length === 0 ? <p className="text-xs text-slate-500">ไม่มีหลักสูตรอื่น</p> : <div className="grid gap-1 sm:grid-cols-2">{others.map(o => <label key={o.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.prerequisiteIds.includes(o.id)} onChange={() => set('prerequisiteIds', c.prerequisiteIds.includes(o.id) ? c.prerequisiteIds.filter(p => p !== o.id) : [...c.prerequisiteIds, o.id])}/>{o.code} · {o.title}</label>)}</div>}</fieldset>
        </div>}
        {tab === 'lessons' && <div className="space-y-3">
          {c.lessons.length === 0 && <p className={`${panelClass} p-6 text-center text-sm text-slate-500`}>ยังไม่มีบทเรียน เริ่มจากเพิ่มบทความหรือวิดีโอ</p>}
          {c.lessons.map((l, i) => <LessonEditor key={l.id} lesson={l} index={i} count={c.lessons.length} open={open === l.id} onToggle={() => setOpen(open === l.id ? '' : l.id)}
            onChange={x => set('lessons', c.lessons.map(k => k.id === l.id ? x : k))} onMove={d => set('lessons', moveItem(c.lessons, i, d))} onDelete={() => { if (window.confirm(`ลบบทเรียน "${l.title || i + 1}"?`)) set('lessons', c.lessons.filter(k => k.id !== l.id)); }}/>)}
          <div className="flex gap-2">{(['article', 'video'] as const).map(t => <button key={t} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white px-4 py-2 text-sm text-blue-700 hover:bg-blue-50" onClick={() => { const l = emptyLesson(t); set('lessons', [...c.lessons, l]); setOpen(l.id); }}><Plus size={15}/>เพิ่ม{t === 'article' ? 'บทความ' : 'วิดีโอ'}</button>)}</div></div>}
        {tab === 'exam' && <QuestionBuilder questions={c.questions} passScore={c.passScore} questionsPerExam={c.questionsPerExam} onChange={q => set('questions', q)}/>}
        {tab === 'rules' && <div className={`${panelClass} grid gap-4 p-5 md:grid-cols-2`}>
          <Field label="เกณฑ์ผ่าน (%)"><input type="number" min={1} max={100} className={inputClass} value={c.passScore} onChange={e => set('passScore', Number(e.target.value))}/></Field>
          <Field label="สอบได้สูงสุด (ครั้ง)"><input type="number" min={1} max={10} className={inputClass} value={c.maxAttempts} onChange={e => set('maxAttempts', Number(e.target.value))}/></Field>
          <Field label="จำนวนข้อที่สุ่มสอบแต่ละครั้ง (0 = ทุกข้อ)"><input type="number" min={0} className={inputClass} value={c.questionsPerExam} onChange={e => set('questionsPerExam', Math.max(0, Number(e.target.value) || 0))}/></Field>
          <Field label="อายุใบรับรอง (เดือน · 0 = ไม่หมดอายุ)"><input type="number" min={0} className={inputClass} value={c.validityMonths} onChange={e => set('validityMonths', Math.max(0, Math.floor(Number(e.target.value) || 0)))}/></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={c.sequential} onChange={e => set('sequential', e.target.checked)}/>บังคับเรียนตามลำดับบทเรียน (ต้องจบบทก่อนหน้าจึงเปิดบทถัดไป)</label>
          <p className="text-xs leading-6 text-slate-500 md:col-span-2">เมื่อผู้เรียนสอบผ่าน ผลจะถูกส่งให้หัวหน้างานรับรองก่อนออกใบรับรอง · ถ้าส่งกลับหรือใช้สิทธิ์สอบครบ ผู้เรียนต้องทบทวนบทเรียนใหม่</p></div>}
      </div>
      <aside className={`${panelClass} h-fit space-y-2 p-4 text-sm`} aria-label="ความพร้อมในการเผยแพร่"><h2 className="font-bold text-slate-800">ความพร้อมเผยแพร่</h2>
        {issues.length === 0 ? <p className="text-emerald-700">ครบถ้วน เผยแพร่ได้</p> : <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">{issues.map(i => <li key={i}>{i}</li>)}</ul>}</aside>
    </div>
  </div>;
}
