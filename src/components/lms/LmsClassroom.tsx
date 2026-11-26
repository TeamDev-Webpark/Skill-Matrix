import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, ClipboardCheck, Clock, FileText, Lock, PlayCircle, Repeat, ShieldCheck, XCircle } from 'lucide-react';
import { allLessonsDone, attemptsUsed, buildExam, gradeQuestion, isAnswered, lessonUnlocked, lessonsDone, progressPercent } from '../../data/lmsCore';
import type { Answer, Attempt, Course, Enrollment, Lesson, PracticalStage, Question } from '../../data/lmsCore';
import { MediaImage } from './useMedia';
import { buttonClass } from '../Phase1Shared';
import LmsCertificate from './LmsCertificate';
import { EnrollmentBadge, EventTimeline, SkillGoal } from './LmsShared';
import VideoPlayer from './VideoPlayer';

type View = { type: 'lesson'; index: number } | { type: 'exam' } | { type: 'status' };
type Info = { checkpointCorrect?: number; checkpointTotal?: number; watchedPct?: number };
type Props = {
  course: Course; enrollment: Enrollment; onBack: () => void; preview?: boolean; currentLevel?: number; skillStage?: PracticalStage;
  onLessonDone: (lessonId: string, info?: Info) => void;
  onSubmitExam: (answers: Record<string, Answer>) => Attempt;
};
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const ghostBtn = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
const LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

/* เนื้อหา: ย่อหน้าอ่านสบาย, รายการ "หัวข้อ: รายละเอียด" แสดงเป็นการ์ดประเด็นสำคัญ */
function Body({ text }: { text: string }) {
  const blocks: ({ bullets: string[] } | { p: string })[] = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith('- ')) { const last = blocks[blocks.length - 1]; if (last && 'bullets' in last) last.bullets.push(line.slice(2)); else blocks.push({ bullets: [line.slice(2)] }); }
    else blocks.push({ p: line });
  }
  return <div className="max-w-[70ch] space-y-5 text-[15px] leading-8 text-slate-700">{blocks.map((b, i) => 'p' in b
    ? <p key={i}>{b.p}</p>
    : <ul key={i} className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">{b.bullets.map((x, k) => { const at = x.indexOf(':'); const label = at > 0 && at < 40 ? x.slice(0, at) : ''; return <li key={k} className="flex gap-3 leading-7"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"/><span>{label ? <><strong className="font-semibold text-slate-900">{label}</strong>{x.slice(at)}</> : x}</span></li>; })}</ul>)}</div>;
}

function LessonFooter({ hasPrev, isLast, done, remaining, total, onPrev, onComplete, onNext, showComplete }: { hasPrev: boolean; isLast: boolean; done: boolean; remaining: number; total: number; onPrev: () => void; onComplete?: () => void; onNext: () => void; showComplete: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round(((total - remaining) / total) * 100)) : 100;
  return <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
    <button className={ghostBtn} disabled={!hasPrev} onClick={onPrev}><ArrowLeft size={16}/>บทก่อนหน้า</button>
    <div className="flex items-center gap-4">
      {showComplete && !done && remaining > 0 && <div className="flex items-center gap-2 text-xs text-slate-500" role="status"><Clock size={14}/>อ่านต่ออีก {remaining} วินาที<span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }}/></span></div>}
      {showComplete && !done && <button className={buttonClass} disabled={remaining > 0} onClick={onComplete}><Check size={16}/>อ่านจบแล้ว · {isLast ? 'ไปทำแบบทดสอบ' : 'ไปบทถัดไป'}</button>}
      {done && <button className={buttonClass} onClick={onNext}>{isLast ? 'ไปทำแบบทดสอบ' : 'บทถัดไป'}<ArrowRight size={16}/></button>}
    </div></div>;
}

function ArticleLesson({ lesson, done, hasPrev, isLast, onPrev, onComplete, onNext }: { lesson: Lesson; done: boolean; hasPrev: boolean; isLast: boolean; onPrev: () => void; onComplete: () => void; onNext: () => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setSeconds(s => s + 1), 1000); return () => window.clearInterval(t); }, []);
  return <><Body text={lesson.body}/><LessonFooter hasPrev={hasPrev} isLast={isLast} done={done} remaining={Math.max(0, lesson.minSeconds - seconds)} total={lesson.minSeconds} onPrev={onPrev} onComplete={onComplete} onNext={onNext} showComplete/></>;
}


const hasChoiceAt = (q: Question, i: number) => !!(q.choices[i]?.trim() || q.choiceImages?.[i]);
function ChoiceBody({ q, i }: { q: Question; i: number }) {
  return <span className="min-w-0 flex-1 space-y-2">{q.choices[i]?.trim() && <span className="block leading-6">{q.choices[i]}</span>}{q.choiceImages?.[i] && <MediaImage src={q.choiceImages[i]} alt={`ภาพตัวเลือก ${LETTERS[i]}`} className="max-h-48"/>}</span>;
}
function QuestionInput({ q, value, onChange }: { q: Question; value: Answer | undefined; onChange: (v: Answer) => void }) {
  if (q.type === 'short') return <input className="mt-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none" aria-label="คำตอบของคุณ" placeholder="พิมพ์คำตอบของคุณ" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}/>;
  if (q.type === 'truefalse') return <div className="mt-3 grid max-w-md grid-cols-2 gap-3" role="radiogroup">{['ถูก', 'ผิด'].map((label, i) => <button key={label} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold ${value === i ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'}`}>{label}</button>)}</div>;
  const multi = q.type === 'multiple'; const picked = Array.isArray(value) ? value : [];
  return <div className="mt-3 grid gap-2" role={multi ? 'group' : 'radiogroup'}>{q.choices.map((_, i) => hasChoiceAt(q, i) && { i }).filter(Boolean).map(x => { const i = (x as { i: number }).i; const on = multi ? picked.includes(i) : value === i;
    return <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-colors ${on ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
      <input type={multi ? 'checkbox' : 'radio'} className="sr-only" name={q.id} checked={on} onChange={() => onChange(multi ? (on ? picked.filter(k => k !== i) : [...picked, i].sort((a, b) => a - b)) : i)}/>
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold ${multi ? 'rounded-md' : 'rounded-full'} ${on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{on && multi ? <Check size={14}/> : LETTERS[i]}</span><ChoiceBody q={q} i={i}/></label>; })}</div>;
}
function answerText(q: Question, a: Answer | undefined) {
  if (a === undefined) return '-';
  if (q.type === 'short') return String(a) || '-';
  if (q.type === 'truefalse') return typeof a === 'number' ? q.choices[a] ?? '-' : '-';
  const list = Array.isArray(a) ? a : [a as number]; return list.map(i => q.choices[i]?.trim() || `ตัวเลือก ${LETTERS[i]} (รูปภาพ)`).join(', ') || '-';
}
function correctText(q: Question) { return q.type === 'short' ? (q.accepted ?? []).filter(x => x.trim()).join(' / ') : q.correct.map(i => q.choices[i]?.trim() || `ตัวเลือก ${LETTERS[i]} (รูปภาพ)`).join(', '); }

function ScoreRing({ score, pass }: { score: number; pass: boolean }) {
  const r = 44; const c = 2 * Math.PI * r;
  return <div className="relative h-28 w-28 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden><circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-slate-200"/><circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className={pass ? 'stroke-emerald-500' : 'stroke-red-500'}/></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-slate-900">{score}%</span><span className={`text-xs font-semibold ${pass ? 'text-emerald-700' : 'text-red-700'}`}>{pass ? 'ผ่าน' : 'ไม่ผ่าน'}</span></div></div>;
}

/* ตัวติดตามสถานะหลังสอบ: สอบผ่าน → Chief รับรอง → (หลักสูตรผูกสกิล) ประเมินหน้างาน → Manager ยืนยันระดับ */
function CertifyTracker({ e, skill, stage }: { e: Enrollment; skill: boolean; stage?: PracticalStage }) {
  const certified = e.status === 'certified';
  const steps: [string, boolean][] = [['สอบผ่าน', e.attempts.some(a => a.passed) || e.status === 'pending-chief' || certified], ['Chief รับรองผลสอบ', certified],
    ...(skill ? [['ประเมินหน้างาน', certified && (!!e.practical?.passed || stage === 'done')], ['Manager ยืนยันระดับสกิล', stage === 'done']] as [string, boolean][] : [])];
  const current = steps.findIndex(([, d]) => !d);
  const note = !skill || !certified ? '' : stage === 'failed' ? `ประเมินหน้างานยังไม่ผ่าน (${e.practical?.score}%) หัวหน้าจะประเมินอีกครั้ง` : stage === 'rejected' ? 'Manager ยังไม่ยืนยันการปรับระดับ หัวหน้าจะพิจารณาอีกครั้ง' : stage === 'waiting-manager' ? 'หัวหน้าเสนอปรับระดับแล้ว รอ Manager ยืนยัน' : stage === 'propose' ? 'ผ่านประเมินหน้างานแล้ว รอหัวหน้าเสนอปรับระดับ' : stage === 'evaluate' ? 'รอหัวหน้าสังเกตการปฏิบัติงานจริง' : '';
  return <div className="space-y-2 print:hidden"><ol className={`grid gap-3 sm:grid-cols-2 ${skill ? 'xl:grid-cols-4' : 'xl:grid-cols-2'}`} aria-label="ขั้นตอนการรับรอง">{steps.map(([label, d], i) => <li key={label} className={`flex items-center gap-3 rounded-xl border p-3 ${d ? 'border-emerald-200 bg-emerald-50' : i === current ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${d ? 'bg-emerald-600 text-white' : i === current ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{d ? <Check size={16}/> : i + 1}</span>
    <span className="text-sm font-semibold text-slate-800">{label}<span className="block text-xs font-normal text-slate-500">{d ? 'เสร็จแล้ว' : i === current ? 'กำลังดำเนินการ' : 'รอขั้นก่อนหน้า'}</span></span></li>)}</ol>
    {note && <p role="status" className="text-sm text-slate-600">{note}</p>}</div>;
}

export default function LmsClassroom({ course, enrollment, onBack, onLessonDone, onSubmitExam, preview = false, skillStage, currentLevel }: Props) {
  const firstOpen = course.lessons.findIndex(l => !enrollment.lessonDone[l.id]);
  const initial: View = ['pending-chief', 'certified', 'locked'].includes(enrollment.status) ? { type: 'status' } : firstOpen < 0 ? { type: 'exam' } : { type: 'lesson', index: firstOpen };
  const [view, setView] = useState<View>(initial);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [review, setReview] = useState<{ attempt: Attempt; exam: Question[]; answers: Record<string, Answer> } | null>(null);
  const [error, setError] = useState('');
  const exam = useMemo(() => buildExam(course, enrollment), [course, enrollment]);
  const lessonsComplete = allLessonsDone(course, enrollment);
  const learning = ['in-progress', 'returned'].includes(enrollment.status);
  const canExam = learning && lessonsComplete && attemptsUsed(enrollment) < course.maxAttempts;
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { topRef.current?.scrollIntoView?.({ block: 'start' }); }, [view]);
  const pct = progressPercent(course, enrollment);
  const totalMin = course.lessons.reduce((n, l) => n + l.durationMin, 0);

  const go = (index: number) => setView(index >= 0 && index < course.lessons.length ? { type: 'lesson', index } : { type: 'exam' });
  function doneLesson(index: number, info?: Info) {
    setError('');
    try { onLessonDone(course.lessons[index].id, info); go(index + 1); } catch (e) { setError((e as Error).message); }
  }
  function submit() {
    setError('');
    try { const snapshot = exam; const attempt = onSubmitExam(answers); setReview({ attempt, exam: snapshot, answers }); setAnswers({}); setView({ type: 'status' }); }
    catch (e) { setError((e as Error).message); }
  }

  type Step = { key: string; title: string; meta: string; icon: React.ReactNode; done: boolean; locked: boolean; current: boolean; onClick: () => void };
  const steps: Step[] = [
    ...course.lessons.map((l, i): Step => {
      const done = !!enrollment.lessonDone[l.id]; const locked = !done && !(learning && lessonUnlocked(course, enrollment, i));
      return { key: l.id, title: l.title.replace(/^บทที่\s*\d+\s*[:：]\s*/, ''), meta: `${l.type === 'video' ? 'วิดีโอ' : 'บทความ'} · ${l.durationMin} นาที`, icon: l.type === 'video' ? <PlayCircle size={12}/> : <FileText size={12}/>, done, locked, current: view.type === 'lesson' && view.index === i, onClick: () => setView({ type: 'lesson', index: i }) };
    }),
    { key: 'exam', title: 'แบบทดสอบท้ายหลักสูตร', meta: `ผ่านที่ ${course.passScore}% · สอบได้ ${course.maxAttempts} ครั้ง`, icon: <ClipboardCheck size={12}/>, done: enrollment.attempts.slice(enrollment.attemptsResetAt).some(a => a.passed), locked: !canExam && view.type !== 'exam', current: view.type === 'exam', onClick: () => { setReview(null); setView({ type: 'exam' }); } },
    { key: 'status', title: 'ผลและการรับรอง', meta: 'ใบรับรองจาก Chief', icon: <Award size={12}/>, done: enrollment.status === 'certified', locked: false, current: view.type === 'status', onClick: () => setView({ type: 'status' }) },
  ];
  const cur = view.type === 'lesson' ? course.lessons[view.index] : null;
  const lastAttempt = review?.attempt;

  return <div className="space-y-5 pb-10" ref={topRef}>
    {/* hero */}
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-6 text-white shadow-md print:hidden md:p-8">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white"><ArrowLeft size={15}/>{preview ? 'ออกจากโหมดทดลอง' : 'กลับ'}</button>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold">{course.category}</span><span className="text-blue-200">{course.code} · เวอร์ชัน {enrollment.courseVersion}</span>{course.mandatory && <span className="rounded-full bg-amber-400 px-2.5 py-1 font-bold text-amber-950">หลักสูตรบังคับ</span>}</div>
          <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{course.title}</h1>
          {course.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">{course.description}</p>}
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-blue-100"><li className="flex items-center gap-1.5"><FileText size={13}/>{course.lessons.length} บทเรียน</li><li className="flex items-center gap-1.5"><Clock size={13}/>ประมาณ {totalMin} นาที</li><li className="flex items-center gap-1.5"><ShieldCheck size={13}/>เกณฑ์ผ่าน {course.passScore}%</li><li className="flex items-center gap-1.5"><Repeat size={13}/>สอบได้ {course.maxAttempts} ครั้ง</li>{course.instructor && <li>ผู้สอน {course.instructor}</li>}</ul>
        </div>
        <SkillGoal course={course} current={currentLevel} tone="dark"/>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4"><div className="min-w-48 flex-1"><div className="mb-1.5 flex justify-between text-xs text-blue-100"><span>ความคืบหน้า</span><span className="font-semibold text-white">{pct}%</span></div><div role="progressbar" aria-label="ความคืบหน้า" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }}/></div></div><EnrollmentBadge e={enrollment}/></div>
    </header>
    {preview && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">โหมดทดลองเรียนสำหรับผู้ดูแลระบบ · ผลทั้งหมดอยู่ชั่วคราวและไม่ถูกบันทึกลงระบบ</p>}
    {enrollment.status === 'returned' && enrollment.chiefRemark && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 print:hidden"><strong>หัวหน้าส่งกลับให้ทบทวน ({enrollment.chiefName}):</strong> {enrollment.chiefRemark} · เรียนบทเรียนใหม่แล้วสอบได้อีก {course.maxAttempts} ครั้ง</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 print:hidden">{error}</p>}

    <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* stepper */}
      <nav aria-label="สารบัญหลักสูตร" className={`${card} p-4 print:hidden lg:sticky lg:top-4`}>
        <p className="mb-3 px-1 text-xs font-semibold text-slate-500">เรียนแล้ว {lessonsDone(course, enrollment)}/{course.lessons.length} บท</p>
        <ol className="relative space-y-1">
          <span className="absolute bottom-6 left-[1.45rem] top-6 w-px bg-slate-200" aria-hidden/>
          {steps.map((s, i) => <li key={s.key} className="relative"><button disabled={s.locked} onClick={s.onClick} aria-current={s.current ? 'step' : undefined}
            className={`relative flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${s.current ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}>
            <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${s.done ? 'border-emerald-500 bg-emerald-500 text-white' : s.current ? 'border-blue-600 bg-white text-blue-700' : s.locked ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-300 bg-white text-slate-600'}`}>{s.done ? <Check size={14}/> : s.locked ? <Lock size={12}/> : i + 1}</span>
            <span className="min-w-0"><span className={`block text-sm leading-5 ${s.current ? 'font-semibold text-blue-900' : 'text-slate-800'}`}>{s.title}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">{s.icon}{s.meta}</span></span></button></li>)}
        </ol>
      </nav>

      {/* content */}
      <section className={`${card} min-w-0 p-6 print:border-0 print:p-0 print:shadow-none md:p-8`} aria-live="polite">
        {cur && view.type === 'lesson' && <article>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-700"><span>บทที่ {view.index + 1} จาก {course.lessons.length}</span><span className="text-slate-300">•</span><span className="flex items-center gap-1 text-slate-500">{cur.type === 'video' ? <PlayCircle size={13}/> : <FileText size={13}/>}{cur.type === 'video' ? 'วิดีโอ' : 'บทความ'} · ประมาณ {cur.durationMin} นาที</span></div>
          <h2 className="text-2xl font-bold leading-snug text-slate-900">{cur.title.replace(/^บทที่\s*\d+\s*[:：]\s*/, '')}</h2>
          {cur.objectives.length > 0 && <section className="mb-7 mt-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5" aria-label="วัตถุประสงค์"><h3 className="mb-2 text-sm font-bold text-blue-900">เมื่อจบบทนี้ คุณจะสามารถ</h3><ul className="space-y-1.5">{cur.objectives.map((o, i) => <li key={i} className="flex gap-2.5 text-sm leading-6 text-slate-700"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600"/>{o}</li>)}</ul></section>}
          {!cur.objectives.length && <div className="mb-6"/>}
          {cur.type === 'video'
            ? <div className="space-y-6"><VideoPlayer key={cur.id} lesson={cur} done={!!enrollment.lessonDone[cur.id]} progressKey={preview ? undefined : `${enrollment.id}:${cur.id}`} onComplete={info => doneLesson(view.index, info)}/>{cur.body.trim() && <Body text={cur.body}/>}
                <LessonFooter hasPrev={view.index > 0} isLast={view.index === course.lessons.length - 1} done={!!enrollment.lessonDone[cur.id]} remaining={0} total={0} showComplete={false} onPrev={() => go(view.index - 1)} onNext={() => go(view.index + 1)}/></div>
            : <ArticleLesson key={cur.id} lesson={cur} done={!!enrollment.lessonDone[cur.id]} hasPrev={view.index > 0} isLast={view.index === course.lessons.length - 1} onPrev={() => go(view.index - 1)} onComplete={() => doneLesson(view.index)} onNext={() => go(view.index + 1)}/>}
        </article>}

        {view.type === 'exam' && <section>
          <p className="text-xs font-semibold text-blue-700">แบบทดสอบท้ายหลักสูตร</p><h2 className="text-2xl font-bold text-slate-900">ทดสอบความเข้าใจ</h2>
          {!lessonsComplete ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">เรียนให้ครบทุกบทเรียนก่อน จึงจะทำแบบทดสอบได้</p>
            : !canExam ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">ตอนนี้ยังทำแบบทดสอบไม่ได้ ดูรายละเอียดที่ขั้น "ผลและการรับรอง"</p>
            : <form onSubmit={e => { e.preventDefault(); submit(); }}>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600"><span>{exam.length} ข้อ</span><span>ผ่านที่ {course.passScore}%</span><span>ใช้สิทธิ์แล้ว {attemptsUsed(enrollment)}/{course.maxAttempts} ครั้ง</span></div>
              <div className="sticky top-0 z-10 -mx-2 mt-4 rounded-xl bg-white/95 px-2 py-2 backdrop-blur"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>ตอบแล้ว {exam.filter(qn => isAnswered(qn, answers[qn.id])).length}/{exam.length} ข้อ</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(exam.filter(qn => isAnswered(qn, answers[qn.id])).length / Math.max(1, exam.length)) * 100}%` }}/></div></div>
              <div className="mt-4 space-y-5">{exam.map((qn, i) => <fieldset key={qn.id} className="rounded-2xl border border-slate-200 p-5"><legend className="sr-only">ข้อที่ {i + 1}</legend>
                <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{i + 1}</span><div className="min-w-0 flex-1 space-y-3"><p className="font-semibold leading-7 text-slate-900">{qn.text}</p>{qn.image && <MediaImage src={qn.image} alt={`ภาพประกอบข้อ ${i + 1}`} className="max-h-72"/>}<p className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{qn.points} คะแนน</span>{qn.type === 'multiple' && <span className="font-semibold text-blue-700">เลือกได้หลายคำตอบ</span>}</p></div></div>
                <QuestionInput q={qn} value={answers[qn.id]} onChange={v => setAnswers(a => ({ ...a, [qn.id]: v }))}/></fieldset>)}</div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><p className="text-xs text-slate-500">ตรวจคำตอบก่อนส่ง · เมื่อส่งแล้วจะนับเป็น 1 ครั้งของสิทธิ์สอบ</p><button className={buttonClass} disabled={exam.some(qn => !isAnswered(qn, answers[qn.id]))}>ส่งคำตอบ ({exam.filter(qn => isAnswered(qn, answers[qn.id])).length}/{exam.length})</button></div></form>}
        </section>}

        {view.type === 'status' && <section className="space-y-7">
          <div><p className="text-xs font-semibold text-blue-700">ผลและการรับรอง</p><h2 className="text-2xl font-bold text-slate-900">{enrollment.status === 'certified' ? 'ใบรับรองผลการเรียน' : 'สถานะของคุณ'}</h2></div>
          {lastAttempt && <div className={`flex flex-wrap items-center gap-6 rounded-2xl border p-5 ${lastAttempt.passed ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}>
            <ScoreRing score={lastAttempt.score} pass={lastAttempt.passed}/>
            <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-900">{lastAttempt.passed ? 'ยินดีด้วย คุณสอบผ่านแล้ว' : 'ยังไม่ผ่านเกณฑ์ในครั้งนี้'}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">ตอบถูก {lastAttempt.correct} จาก {lastAttempt.total} ข้อ · เกณฑ์ผ่าน {course.passScore}% · {lastAttempt.passed ? 'ผลถูกส่งให้ Chief รับรองแล้ว' : enrollment.status === 'locked' ? 'ใช้สิทธิ์สอบครบแล้ว ติดต่อ Chief เพื่อปลดล็อก' : `เหลือสิทธิ์สอบอีก ${course.maxAttempts - attemptsUsed(enrollment)} ครั้ง`}</p>
              {canExam && <button className={`${buttonClass} mt-3`} onClick={() => { setReview(null); setView({ type: 'exam' }); }}><Repeat size={16}/>สอบอีกครั้ง</button>}</div></div>}
          {(enrollment.status === 'pending-chief' || enrollment.status === 'certified' || lastAttempt?.passed) && <CertifyTracker e={enrollment} skill={course.skillToLevel > 0 && !!course.wiCode} stage={skillStage}/>}
          {enrollment.status === 'pending-chief' && <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">Chief จะตรวจผลและรับรองให้ เมื่อรับรองแล้วใบรับรองจะแสดงที่หน้านี้และเมนู "ใบรับรองของฉัน" ทันที</p>}
          {enrollment.status === 'locked' && <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">ใช้สิทธิ์สอบครบ {course.maxAttempts} ครั้งแล้ว ติดต่อ Chief เพื่อปลดล็อกสิทธิ์ และทบทวนบทเรียนอีกครั้ง</p>}
          {learning && !lastAttempt && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{canExam ? 'เรียนครบแล้ว พร้อมทำแบบทดสอบท้ายหลักสูตร' : `เรียนแล้ว ${lessonsDone(course, enrollment)}/${course.lessons.length} บท`}</p>}
          {enrollment.status === 'certified' && <LmsCertificate course={course} enrollment={enrollment}/>}
          {review && <div className="print:hidden"><h3 className="mb-3 text-sm font-bold text-slate-800">เฉลยและคำอธิบาย</h3><ol className="space-y-2">{review.exam.map((qn, i) => { const earned = gradeQuestion(qn, review.answers[qn.id]); const full = earned === qn.points; return <li key={qn.id}><details className="group rounded-xl border border-slate-200 bg-white open:shadow-sm" open={!full}><summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 text-sm">{full ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600"/> : earned > 0 ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-amber-500"/> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-600"/>}<span className="flex-1 font-medium text-slate-800">{i + 1}. {qn.text || '(คำถามเป็นรูปภาพ)'}</span><span className="shrink-0 text-xs font-semibold text-slate-500">{earned}/{qn.points}</span></summary>
            <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm leading-6">{qn.image && <MediaImage src={qn.image} alt="" className="max-h-40"/>}<p className={full ? 'text-emerald-700' : 'text-red-700'}>คุณตอบ: {answerText(qn, review.answers[qn.id])}</p>{!full && <p className="text-emerald-700">เฉลย: {correctText(qn)}</p>}{qn.explanation && <p className="text-slate-500">{qn.explanation}</p>}</div></details></li>; })}</ol></div>}
          <details className="rounded-xl border border-slate-200 print:hidden"><summary className="cursor-pointer p-3.5 text-sm font-semibold text-slate-700">ประวัติการสอบและบันทึกการดำเนินการ</summary><div className="space-y-5 border-t border-slate-100 p-4">
            {enrollment.attempts.length ? <table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-1">ครั้งที่</th><th>คะแนน</th><th>ผล</th></tr></thead><tbody>{enrollment.attempts.map((a, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1.5">{i + 1}</td><td>{a.score}% ({a.correct}/{a.total})</td><td className={a.passed ? 'text-emerald-700' : 'text-red-700'}>{a.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">ยังไม่เคยสอบ</p>}
            <EventTimeline events={enrollment.events}/></div></details>
        </section>}
      </section>
    </div>
  </div>;
}
