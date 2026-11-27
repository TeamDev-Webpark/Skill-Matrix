import type { Role } from './phase1Core';

/* ---------- ชนิดข้อมูล ---------- */
export type LessonType = 'video' | 'article';
export interface Checkpoint { id: string; timeSec: number; question: string; choices: string[]; answerIndex: number; explanation?: string }
/** ไฟล์แนบบทเรียน: ref = 'idb:…' (อัปโหลด) หรือลิงก์/พาธของไฟล์ */
export interface Attachment { id: string; kind: 'pdf' | 'image'; name: string; ref: string; size?: number }
export interface Lesson {
  attachments?: Attachment[]; requireOpen?: boolean;   // requireOpen: บทความต้องเปิดอ่าน PDF ครบก่อนกดจบ
  id: string; title: string; type: LessonType; durationMin: number;
  objectives: string[]; body: string;            // body: ข้อความ ขึ้นบรรทัดใหม่ = ย่อหน้า, "- " นำหน้า = bullet
  videoUrl?: string; videoName?: string;           // videoUrl: ลิงก์ หรือ 'idb:…' = ไฟล์ที่อัปโหลดในเบราว์เซอร์
  requiredWatchPct?: number;                       // ต้องดูจริงอย่างน้อยกี่ % ของวิดีโอ (ค่าเริ่มต้น 90)
  checkpoints: Checkpoint[];
  minSeconds: number;                              // เวลาขั้นต่ำที่ต้องอยู่ในบทเรียน (กันกดข้าม)
}
/** ชนิดข้อสอบแบบ Google Form: ตัวเลือกเดียว / หลายคำตอบ / ถูก-ผิด / เติมคำตอบสั้น */
export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'short';
export type Answer = number | number[] | string;
export const QUESTION_TYPES: Record<QuestionType, string> = { single: 'เลือกคำตอบเดียว', multiple: 'เลือกได้หลายคำตอบ', truefalse: 'ถูก / ผิด', short: 'เติมคำตอบสั้น' };
export interface Question {
  id: string; type: QuestionType; text: string; image?: string;   // image: 'idb:…' (ไฟล์ในเบราว์เซอร์) หรือลิงก์ http(s)
  choices: string[]; choiceImages?: string[];                      // choiceImages ขนานกับ choices
  correct: number[];                                               // ดัชนีตัวเลือกที่ถูก (single/truefalse = 1 ตัว)
  accepted?: string[];                                             // short: คำตอบที่ยอมรับ (ไม่สนตัวพิมพ์/ช่องว่างหัวท้าย)
  points: number; partial?: boolean; shuffle?: boolean; explanation: string;
}
export type CourseStatus = 'draft' | 'published' | 'archived';
export interface Course {
  id: string; code: string; title: string; description: string; category: string;
  department: string;                              // 'ALL' = ทุกแผนก
  wiCode?: string; skillType?: string;             // สกิล (W/I + ประเภท) ที่หลักสูตรนี้ช่วยยกระดับ
  skillFromLevel: number; skillToLevel: number;    // ระดับที่เหมาะจะเริ่มเรียน → ระดับเป้าหมาย (0 = ไม่ผูกเป้าหมาย)
  instructor: string; mandatory: boolean;
  passScore: number; maxAttempts: number; questionsPerExam: number; // 0 = ใช้ทุกข้อ
  validityMonths: number;                          // 0 = ไม่หมดอายุ
  sequential: boolean;                             // บังคับเรียนตามลำดับบทเรียน
  prerequisiteIds: string[];
  version: number; status: CourseStatus;
  lessons: Lesson[]; questions: Question[];
  createdAt: string; updatedAt: string; updatedBy: string;
}
export type EnrollmentStatus = 'in-progress' | 'pending-chief' | 'certified' | 'returned' | 'locked';
export interface Attempt { at: string; score: number; correct: number; total: number; passed: boolean; points?: number; totalPoints?: number }
export interface LmsEvent { at: string; actor: string; action: string; note?: string }
export interface Enrollment {
  id: string; courseId: string; courseVersion: number;
  employeeId: string; employeeName: string; department: string;
  source: 'self' | 'assigned'; assignedBy?: string; dueDate?: string;
  enrolledAt: string; status: EnrollmentStatus;
  lessonDone: Record<string, { at: string; checkpointCorrect?: number; checkpointTotal?: number; watchedPct?: number }>;
  attempts: Attempt[]; attemptsResetAt: number;    // นับความพยายามหลังรีเซ็ตจาก index นี้
  passedAt?: string;
  chiefName?: string; chiefRemark?: string; chiefReviewedAt?: string;
  certificateNo?: string; certifiedAt?: string; expiryDate?: string;
  practical?: Practical;                            // ผลประเมินหน้างานล่าสุด (เฉพาะหลักสูตรที่ผูกสกิล)
  proposal?: { adjustmentId: string; level: number; at: string };  // ข้อเสนอปรับระดับสกิลที่ส่งให้ Manager
  events: LmsEvent[];
}
export interface Practical { score: number; passed: boolean; note: string; observedOn: string; evaluatedBy: string; evaluatedAt: string }
export const PRACTICAL_PASS = 80;                    // เกณฑ์เดียวกับการประเมินฝึกอบรมเดิม
export interface LmsState { courses: Course[]; enrollments: Enrollment[] }

export const ENROLLMENT_STATUS: Record<EnrollmentStatus, string> = {
  'in-progress': 'กำลังเรียน', 'pending-chief': 'รอหัวหน้ารับรองผล', certified: 'รับรองผลแล้ว',
  returned: 'หัวหน้าส่งกลับให้ทบทวน', locked: 'สอบครบสิทธิ์ · รอปลดล็อก',
};
export const COURSE_STATUS: Record<CourseStatus, string> = { draft: 'ฉบับร่าง', published: 'เผยแพร่แล้ว', archived: 'เก็บถาวร' };
export const skillKey = (c: Pick<Course, 'wiCode' | 'skillType'>) => c.wiCode && c.skillType ? `${c.wiCode}_${c.skillType}` : undefined;
/** เทียบระดับปัจจุบันของพนักงานกับเป้าหมายของหลักสูตร */
export function skillFit(c: Pick<Course, 'skillFromLevel' | 'skillToLevel'>, current: number): 'none' | 'recommended' | 'too-early' | 'reached' {
  if (!c.skillToLevel) return 'none';
  if (current >= c.skillToLevel) return 'reached';
  return current >= c.skillFromLevel ? 'recommended' : 'too-early';
}
export const COURSE_CATEGORIES = ['ความปลอดภัย', 'คุณภาพ', 'เทคนิคการผลิต', 'ระบบและเอกสาร', 'ทักษะทั่วไป'];

/* ---------- ตัวช่วยพื้นฐาน ---------- */
export function bkkDate(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return `${p.find(x => x.type === 'year')!.value}-${p.find(x => x.type === 'month')!.value}-${p.find(x => x.type === 'day')!.value}`;
}
export function addMonths(ymd: string, months: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
export function uid(prefix: string) { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }
const ev = (actor: string, action: string, note: string | undefined, now: Date): LmsEvent => ({ at: now.toISOString(), actor, action, ...(note ? { note } : {}) });
const find = (s: LmsState, id: string) => s.enrollments.find(e => e.id === id);
const course = (s: LmsState, id: string) => s.courses.find(c => c.id === id);
const patch = (s: LmsState, id: string, change: (e: Enrollment) => Enrollment): LmsState => ({ ...s, enrollments: s.enrollments.map(e => e.id === id ? change(e) : e) });

export function attemptsUsed(e: Enrollment) { return Math.max(0, e.attempts.length - e.attemptsResetAt); }
export function lessonsDone(c: Course, e: Enrollment) { return c.lessons.filter(l => e.lessonDone[l.id]).length; }
export function allLessonsDone(c: Course, e: Enrollment) { return c.lessons.length > 0 && lessonsDone(c, e) === c.lessons.length; }
export function progressPercent(c: Course, e: Enrollment) {
  if (e.status === 'certified' || e.status === 'pending-chief') return 100;
  const total = c.lessons.length + 1;
  return Math.round((lessonsDone(c, e) / total) * 100);
}
export function isExpired(e: Enrollment, today = bkkDate()) { return e.status === 'certified' && !!e.expiryDate && e.expiryDate < today; }
export function isOverdue(e: Enrollment, today = bkkDate()) { return !!e.dueDate && e.dueDate < today && e.status !== 'certified' && e.status !== 'pending-chief'; }
export function expiringSoon(e: Enrollment, days = 60, today = bkkDate()) {
  if (e.status !== 'certified' || !e.expiryDate || e.expiryDate < today) return false;
  return e.expiryDate <= bkkDate(new Date(new Date(`${today}T00:00:00Z`).getTime() + days * 86400000));
}
/** enrollment ที่ยังใช้งานอยู่ของคนนี้ในหลักสูตรนี้ (ยังไม่รับรอง หรือรับรองแล้วและยังไม่หมดอายุ) */
export function activeEnrollment(s: LmsState, employeeId: string, courseId: string) {
  return s.enrollments.find(e => e.employeeId === employeeId && e.courseId === courseId && !isExpired(e));
}
export function courseAudience(c: Course, department: string) { return c.status === 'published' && (c.department === 'ALL' || c.department === department); }
export function prerequisitesMet(s: LmsState, c: Course, employeeId: string) {
  return c.prerequisiteIds.every(id => s.enrollments.some(e => e.employeeId === employeeId && e.courseId === id && e.status === 'certified' && !isExpired(e)));
}

/* ---------- การลงทะเบียน (Staff เรียนเองได้ ไม่ต้องยื่นคำขอ) ---------- */
export interface Learner { id: string; name: string; department: string }
export function enroll(s: LmsState, learner: Learner, courseId: string, by: { role: Role; name: string; reportIds?: string[] }, opts: { dueDate?: string } = {}, now = new Date()): LmsState {
  const c = course(s, courseId);
  if (!c || c.status !== 'published') throw new Error('หลักสูตรนี้ยังไม่เปิดให้เรียน');
  if (by.role === 'chief' && !by.reportIds?.includes(learner.id)) throw new Error('มอบหมายได้เฉพาะลูกทีมตรงของคุณ');
  if (!courseAudience(c, learner.department)) throw new Error('หลักสูตรนี้ไม่ได้เปิดสำหรับแผนกของผู้เรียน');
  if (opts.dueDate && opts.dueDate < bkkDate(now)) throw new Error('กำหนดเรียนให้เสร็จต้องตั้งแต่วันนี้เป็นต้นไป');
  const existing = activeEnrollment(s, learner.id, courseId);
  if (existing) throw new Error(by.role === 'staff' ? 'คุณลงทะเบียนหลักสูตรนี้แล้ว' : `${learner.name} ลงทะเบียนหลักสูตรนี้แล้ว`);
  if (!prerequisitesMet(s, c, learner.id)) throw new Error('ต้องผ่านหลักสูตรก่อนหน้าที่กำหนดก่อน');
  const self = by.role === 'staff';
  const e: Enrollment = {
    id: uid('ENR'), courseId, courseVersion: c.version, employeeId: learner.id, employeeName: learner.name, department: learner.department,
    source: self ? 'self' : 'assigned', assignedBy: self ? undefined : by.name, dueDate: opts.dueDate || undefined,
    enrolledAt: now.toISOString(), status: 'in-progress', lessonDone: {}, attempts: [], attemptsResetAt: 0,
    events: [ev(by.name, self ? 'สมัครเรียนเอง' : 'มอบหมายหลักสูตร', opts.dueDate ? `กำหนดเสร็จ ${opts.dueDate}` : undefined, now)],
  };
  return { ...s, enrollments: [...s.enrollments, e] };
}

/* ---------- การเรียน ---------- */
export function lessonUnlocked(c: Course, e: Enrollment, index: number) {
  if (!c.sequential || index === 0) return true;
  return !!e.lessonDone[c.lessons[index - 1].id];
}
export function completeLesson(s: LmsState, enrollmentId: string, lessonId: string, info: { checkpointCorrect?: number; checkpointTotal?: number; watchedPct?: number } = {}, now = new Date()): LmsState {
  const e = find(s, enrollmentId); const c = e && course(s, e.courseId);
  if (!e || !c) throw new Error('ไม่พบการลงทะเบียน');
  if (!['in-progress', 'returned'].includes(e.status)) throw new Error('สถานะนี้เรียนบทเรียนเพิ่มไม่ได้');
  const index = c.lessons.findIndex(l => l.id === lessonId);
  if (index < 0) throw new Error('ไม่พบบทเรียน');
  if (!lessonUnlocked(c, e, index)) throw new Error('ต้องเรียนบทก่อนหน้าให้จบก่อน');
  if (e.lessonDone[lessonId]) return s;
  return patch(s, enrollmentId, x => ({ ...x, lessonDone: { ...x.lessonDone, [lessonId]: { at: now.toISOString(), ...info } }, events: [...x.events, ev(x.employeeName, 'เรียนจบบทเรียน', c.lessons[index].title, now)] }));
}

/* ---------- แบบทดสอบ ---------- */
function seededRandom(seed: number) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function hash(text: string) { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const hasChoice = (q: Question, i: number) => !!(q.choices[i]?.trim() || q.choiceImages?.[i]);
/** ปรับข้อสอบให้พร้อมใช้: ตัดตัวเลือกว่าง และแปลงข้อมูลรูปแบบเก่า (answerIndex) */
export function normalizeQuestion(raw: Question & { answerIndex?: number }): Question {
  const type: QuestionType = raw.type ?? 'single';
  const correct = raw.correct ?? (raw.answerIndex !== undefined ? [raw.answerIndex] : [0]);
  return { ...raw, type, correct, points: raw.points > 0 ? raw.points : 1, choices: raw.choices ?? [], explanation: raw.explanation ?? '' };
}
function cleanChoices(q: Question): Question {
  if (q.type === 'short') return q;
  const keep = q.choices.map((_, i) => i).filter(i => q.type === 'truefalse' || hasChoice(q, i));
  const remap = new Map(keep.map((old, n) => [old, n]));
  return { ...q, choices: keep.map(i => q.choices[i]), choiceImages: q.choiceImages ? keep.map(i => q.choiceImages![i] ?? '') : undefined, correct: q.correct.filter(i => remap.has(i)).map(i => remap.get(i)!) };
}
/** สุ่มชุดข้อสอบ (และสลับตัวเลือก) แบบคงที่ต่อ (enrollment, ครั้งที่สอบ) เพื่อให้รีเฟรชแล้วได้ชุดเดิม */
export function buildExam(c: Course, e: Enrollment): Question[] {
  const rnd = seededRandom(hash(`${e.id}:${e.attempts.length}`));
  const order = c.questions.map((q, i) => ({ q: cleanChoices(normalizeQuestion(q)), k: rnd() + i * 1e-9 })).sort((a, b) => a.k - b.k).map(x => x.q);
  const n = c.questionsPerExam > 0 ? Math.min(c.questionsPerExam, order.length) : order.length;
  return order.slice(0, n).map(q => {
    if (q.shuffle === false || (q.type !== 'single' && q.type !== 'multiple')) return q;
    const perm = q.choices.map((_, i) => ({ i, k: rnd() })).sort((a, b) => a.k - b.k).map(x => x.i);   // perm[new] = old
    return { ...q, choices: perm.map(o => q.choices[o]), choiceImages: q.choiceImages ? perm.map(o => q.choiceImages![o] ?? '') : undefined, correct: q.correct.map(o => perm.indexOf(o)).sort((a, b) => a - b) };
  });
}
const norm = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase();
export function isAnswered(q: Question, a: Answer | undefined) {
  if (q.type === 'multiple') return Array.isArray(a) && a.length > 0;
  if (q.type === 'short') return typeof a === 'string' && a.trim() !== '';
  return typeof a === 'number';
}
/** คะแนนที่ได้ในข้อนี้ (0..points) */
export function gradeQuestion(q: Question, a: Answer | undefined): number {
  if (!isAnswered(q, a)) return 0;
  if (q.type === 'short') return (q.accepted ?? []).some(x => norm(x) === norm(a as string)) ? q.points : 0;
  if (q.type === 'multiple') {
    const picked = new Set(a as number[]); const right = new Set(q.correct);
    const hit = [...picked].filter(i => right.has(i)).length; const wrong = picked.size - hit;
    if (hit === right.size && wrong === 0) return q.points;
    return q.partial ? Math.round(q.points * Math.max(0, (hit - wrong) / right.size) * 100) / 100 : 0;
  }
  return a === q.correct[0] ? q.points : 0;
}
export function gradeExam(questions: Question[], answers: Record<string, Answer>) {
  const totalPoints = questions.reduce((n, q) => n + q.points, 0);
  const points = Math.round(questions.reduce((n, q) => n + gradeQuestion(q, answers[q.id]), 0) * 100) / 100;
  const correct = questions.filter(q => gradeQuestion(q, answers[q.id]) === q.points).length;
  return { correct, total: questions.length, points, totalPoints, score: totalPoints ? Math.round((points / totalPoints) * 100) : 0 };
}
export function submitExam(s: LmsState, enrollmentId: string, answers: Record<string, Answer>, now = new Date()): { state: LmsState; attempt: Attempt } {
  const e = find(s, enrollmentId); const c = e && course(s, e.courseId);
  if (!e || !c) throw new Error('ไม่พบการลงทะเบียน');
  if (!['in-progress', 'returned'].includes(e.status)) throw new Error('สถานะนี้สอบไม่ได้');
  if (!allLessonsDone(c, e)) throw new Error('ต้องเรียนครบทุกบทเรียนก่อนสอบ');
  if (attemptsUsed(e) >= c.maxAttempts) throw new Error('ใช้สิทธิ์สอบครบแล้ว ให้ติดต่อหัวหน้าหรือผู้ดูแลระบบเพื่อปลดล็อก');
  const exam = buildExam(c, e);
  if (exam.some(q => !isAnswered(q, answers[q.id]))) throw new Error('ตอบให้ครบทุกข้อก่อนส่ง');
  const g = gradeExam(exam, answers);
  const attempt: Attempt = { at: now.toISOString(), score: g.score, correct: g.correct, total: g.total, passed: g.score >= c.passScore, points: g.points, totalPoints: g.totalPoints };
  const used = attemptsUsed(e) + 1;
  const state = patch(s, enrollmentId, x => ({
    ...x, attempts: [...x.attempts, attempt],
    status: attempt.passed ? 'pending-chief' : used >= c.maxAttempts ? 'locked' : x.status,
    passedAt: attempt.passed ? now.toISOString() : x.passedAt,
    events: [...x.events, ev(x.employeeName, attempt.passed ? 'สอบผ่านและส่งให้หัวหน้ารับรอง' : 'สอบไม่ผ่าน', `${g.score}% (${g.correct}/${g.total}) ครั้งที่ ${used}/${c.maxAttempts}`, now)],
  }));
  return { state, attempt };
}

/* ---------- Chief รับรองผล / ปลดล็อก ---------- */
export function nextCertificateNo(s: LmsState, now = new Date()) {
  const year = bkkDate(now).slice(0, 4);
  // ต่อจากเลขสูงสุด (ไม่ใช้การนับจำนวน) เลขจึงไม่ซ้ำแม้ลำดับเดิมมีช่องว่าง
  const last = Math.max(0, ...s.enrollments.filter(e => e.certificateNo?.startsWith(`CERT-${year}-`)).map(e => Number(e.certificateNo!.slice(10)) || 0));
  return `CERT-${year}-${String(last + 1).padStart(4, '0')}`;
}
export function certifyResult(s: LmsState, role: Role, chief: { name: string; reportIds: string[] }, enrollmentId: string, approve: boolean, remark: string, now = new Date()): LmsState {
  if (role !== 'chief') throw new Error('เฉพาะหัวหน้างานที่รับรองผลการเรียนได้');
  const e = find(s, enrollmentId); const c = e && course(s, e.courseId);
  if (!e || !c || e.status !== 'pending-chief' || !chief.reportIds.includes(e.employeeId)) throw new Error('ไม่พบผลการเรียนที่รอรับรองของลูกทีมตรงของคุณ');
  if (!approve && !remark.trim()) throw new Error('ระบุเหตุผลที่ส่งกลับให้ทบทวน');
  const today = bkkDate(now);
  if (approve) {
    const no = nextCertificateNo(s, now);
    return patch(s, enrollmentId, x => ({ ...x, status: 'certified', chiefName: chief.name, chiefRemark: remark.trim(), chiefReviewedAt: now.toISOString(), certificateNo: no, certifiedAt: now.toISOString(),
      expiryDate: c.validityMonths > 0 ? addMonths(today, c.validityMonths) : undefined, events: [...x.events, ev(chief.name, 'รับรองผลการเรียน', `ออกใบรับรอง ${no}`, now)] }));
  }
  // ส่งกลับ: รีเซ็ตสิทธิ์สอบ และให้ทบทวนบทเรียนใหม่ทั้งหมด
  return patch(s, enrollmentId, x => ({ ...x, status: 'returned', lessonDone: {}, attemptsResetAt: x.attempts.length, passedAt: undefined, chiefName: chief.name, chiefRemark: remark.trim(), chiefReviewedAt: now.toISOString(),
    events: [...x.events, ev(chief.name, 'ส่งกลับให้ทบทวน', remark.trim(), now)] }));
}
export function unlockAttempts(s: LmsState, role: Role, actor: { name: string; reportIds?: string[] }, enrollmentId: string, note: string, now = new Date()): LmsState {
  if (role !== 'chief' && role !== 'admin') throw new Error('เฉพาะหัวหน้างานหรือผู้ดูแลระบบที่ปลดล็อกสิทธิ์สอบได้');
  const e = find(s, enrollmentId);
  if (!e || e.status !== 'locked') throw new Error('ไม่พบรายการที่รอปลดล็อก');
  if (role === 'chief' && !actor.reportIds?.includes(e.employeeId)) throw new Error('ปลดล็อกได้เฉพาะลูกทีมตรงของคุณ');
  if (!note.trim()) throw new Error('ระบุเหตุผลที่ปลดล็อก');
  return patch(s, enrollmentId, x => ({ ...x, status: 'returned', lessonDone: {}, attemptsResetAt: x.attempts.length, events: [...x.events, ev(actor.name, 'ปลดล็อกสิทธิ์สอบ (ให้ทบทวนบทเรียนใหม่)', note.trim(), now)] }));
}
export function removeEnrollment(s: LmsState, role: Role, id: string): LmsState {
  if (role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบที่ยกเลิกการลงทะเบียนได้');
  const e = find(s, id);
  if (!e) throw new Error('ไม่พบการลงทะเบียน');
  if (e.status === 'certified') throw new Error('รายการที่รับรองผลแล้วเป็นหลักฐาน ไม่สามารถลบได้');
  return { ...s, enrollments: s.enrollments.filter(x => x.id !== id) };
}
export function setDueDate(s: LmsState, role: Role, actorName: string, id: string, dueDate: string, now = new Date(), reportIds: string[] = []): LmsState {
  if (role !== 'admin' && role !== 'chief') throw new Error('ไม่มีสิทธิ์แก้กำหนดเรียน');
  if (role === 'chief' && !reportIds.includes(find(s, id)?.employeeId ?? '')) throw new Error('แก้กำหนดเรียนได้เฉพาะลูกทีมตรงของคุณ');
  if (dueDate && dueDate < bkkDate(now)) throw new Error('กำหนดเรียนให้เสร็จต้องตั้งแต่วันนี้เป็นต้นไป');
  return patch(s, id, x => ({ ...x, dueDate: dueDate || undefined, events: [...x.events, ev(actorName, 'แก้กำหนดเรียน', dueDate || 'ยกเลิกกำหนด', now)] }));
}

/* ---------- ประเมินหน้างาน → เสนอปรับระดับสกิล ---------- */
/** สถานะของขั้นหลังรับรองผลสอบ (adjustment = สถานะคำขอปรับคะแนนใน Skill Matrix ถ้าส่งไปแล้ว) */
export type PracticalStage = 'none' | 'evaluate' | 'failed' | 'propose' | 'waiting-manager' | 'rejected' | 'done';
export function practicalStage(c: Course, e: Enrollment, currentLevel: number, adjustment?: 'pending' | 'approved' | 'rejected'): PracticalStage {
  if (e.status !== 'certified' || !c.skillToLevel || !skillKey(c)) return 'none';
  if (e.proposal && adjustment === 'pending') return 'waiting-manager';
  // Manager อนุมัติแต่ปรับเป็นระดับต่ำกว่าเป้า = ยังไม่ถึงเป้า ให้ประเมินและเสนอใหม่ได้
  if (e.proposal && adjustment === 'approved') return currentLevel >= c.skillToLevel ? 'done' : 'rejected';
  if (e.proposal && adjustment === 'rejected') return 'rejected';
  if (currentLevel >= c.skillToLevel) return 'done';
  if (isExpired(e)) return 'none';
  if (!e.practical) return 'evaluate';
  return e.practical.passed ? 'propose' : 'failed';
}
export function recordPractical(s: LmsState, role: Role, chief: { name: string; reportIds: string[] }, enrollmentId: string, input: { score: number; note: string; observedOn: string }, now = new Date()): LmsState {
  if (role !== 'chief') throw new Error('เฉพาะหัวหน้างานที่ประเมินหน้างานได้');
  const e = find(s, enrollmentId); const c = e && course(s, e.courseId);
  if (!e || !c || !chief.reportIds.includes(e.employeeId)) throw new Error('ไม่พบรายการของลูกทีมตรงของคุณ');
  if (e.status !== 'certified' || !skillKey(c) || !c.skillToLevel) throw new Error('ประเมินหน้างานได้หลังรับรองผลสอบของหลักสูตรที่ผูกสกิลเท่านั้น');
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) throw new Error('คะแนนปฏิบัติต้องอยู่ระหว่าง 0–100');
  const today = bkkDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.observedOn) || input.observedOn > today) throw new Error('ระบุวันที่สังเกตการปฏิบัติงาน (ไม่เกินวันนี้)');
  if (e.passedAt && input.observedOn < bkkDate(new Date(e.passedAt))) throw new Error('วันประเมินหน้างานต้องไม่ก่อนวันที่สอบผ่าน');
  if (!input.note.trim()) throw new Error('ระบุสิ่งที่สังเกตหรือหลักฐานอ้างอิง');
  const practical: Practical = { score: input.score, passed: input.score >= PRACTICAL_PASS, note: input.note.trim(), observedOn: input.observedOn, evaluatedBy: chief.name, evaluatedAt: now.toISOString() };
  return patch(s, enrollmentId, x => ({ ...x, practical, proposal: undefined, events: [...x.events, ev(chief.name, practical.passed ? 'ประเมินหน้างานผ่าน' : 'ประเมินหน้างานไม่ผ่าน', `${practical.score}% · ${practical.note}`, now)] }));
}
export function markProposed(s: LmsState, role: Role, chief: { name: string; reportIds: string[] }, enrollmentId: string, proposal: { adjustmentId: string; level: number }, now = new Date()): LmsState {
  if (role !== 'chief') throw new Error('เฉพาะหัวหน้างานที่เสนอปรับระดับได้');
  const e = find(s, enrollmentId);
  if (!e || !chief.reportIds.includes(e.employeeId)) throw new Error('ไม่พบรายการของลูกทีมตรงของคุณ');
  if (!e.practical?.passed) throw new Error('ต้องผ่านการประเมินหน้างานก่อนจึงเสนอปรับระดับได้');
  return patch(s, enrollmentId, x => ({ ...x, proposal: { ...proposal, at: now.toISOString() }, events: [...x.events, ev(chief.name, 'เสนอปรับระดับสกิลให้ Manager', `เป็น Lv ${proposal.level}`, now)] }));
}

/* ---------- Admin จัดการหลักสูตร ---------- */
export function validateCourse(c: Course, all: Course[], forPublish = false): string[] {
  const errors: string[] = [];
  if (!c.title.trim()) errors.push('ระบุชื่อหลักสูตร');
  if (!c.code.trim()) errors.push('ระบุรหัสหลักสูตร');
  else if (all.some(o => o.id !== c.id && o.code.trim().toLowerCase() === c.code.trim().toLowerCase())) errors.push('รหัสหลักสูตรซ้ำกับหลักสูตรอื่น');
  if (!(c.passScore >= 1 && c.passScore <= 100)) errors.push('เกณฑ์ผ่านต้องอยู่ระหว่าง 1–100');
  if (!(Number.isInteger(c.maxAttempts) && c.maxAttempts >= 1 && c.maxAttempts <= 10)) errors.push('จำนวนครั้งที่สอบได้ต้องอยู่ระหว่าง 1–10');
  if (!(Number.isInteger(c.validityMonths) && c.validityMonths >= 0)) errors.push('อายุใบรับรอง (เดือน) ต้องไม่ติดลบ');
  c.lessons.forEach((l, i) => {
    if (!l.title.trim()) errors.push(`บทเรียนที่ ${i + 1}: ระบุชื่อ`);
    if (l.type === 'video' && forPublish && !l.videoUrl?.trim()) errors.push(`บทเรียนที่ ${i + 1}: ใส่ลิงก์วิดีโอ`);
    if (l.type === 'article' && forPublish && !l.body.trim() && !l.attachments?.length) errors.push(`บทเรียนที่ ${i + 1}: ใส่เนื้อหาหรือแนบไฟล์`);
    if (l.attachments?.some(a => !a.name.trim())) errors.push(`บทเรียนที่ ${i + 1}: ตั้งชื่อไฟล์แนบให้ครบ`);
    l.checkpoints.forEach((cp, k) => { if (!cp.question.trim() || cp.choices.filter(x => x.trim()).length < 2 || cp.answerIndex < 0 || cp.answerIndex >= cp.choices.length || !cp.choices[cp.answerIndex]?.trim()) errors.push(`บทเรียนที่ ${i + 1} จุดถามที่ ${k + 1}: คำถามต้องมีอย่างน้อย 2 ตัวเลือกและระบุคำตอบที่ถูก`); });
  });
  c.questions.map(normalizeQuestion).forEach((q, i) => {
    const n = i + 1; const filled = q.choices.map((_, k) => hasChoice(q, k));
    if (!q.text.trim() && !q.image) errors.push(`ข้อสอบข้อ ${n}: ระบุคำถามหรือใส่รูปคำถาม`);
    if (!(q.points > 0 && q.points <= 100)) errors.push(`ข้อสอบข้อ ${n}: คะแนนต้องมากกว่า 0 และไม่เกิน 100`);
    if (q.type === 'short') { if (!(q.accepted ?? []).some(x => x.trim())) errors.push(`ข้อสอบข้อ ${n}: ใส่คำตอบที่ยอมรับอย่างน้อย 1 คำตอบ`); }
    else if (q.type === 'truefalse') { if (q.correct.length !== 1) errors.push(`ข้อสอบข้อ ${n}: เลือกว่าถูกหรือผิด`); }
    else {
      if (filled.filter(Boolean).length < 2) errors.push(`ข้อสอบข้อ ${n}: ต้องมีอย่างน้อย 2 ตัวเลือก`);
      else if (!q.correct.length || q.correct.some(k => !filled[k])) errors.push(`ข้อสอบข้อ ${n}: ระบุคำตอบที่ถูกต้อง`);
      else if (q.type === 'single' && q.correct.length !== 1) errors.push(`ข้อสอบข้อ ${n}: เลือกคำตอบเดียวมีคำตอบถูกได้ 1 ตัวเลือก`);
    }
  });
  if (forPublish) {
    if (!c.lessons.length) errors.push('ต้องมีบทเรียนอย่างน้อย 1 บท');
    if (!c.questions.length) errors.push('ต้องมีข้อสอบอย่างน้อย 1 ข้อ');
    if (c.questionsPerExam > c.questions.length) errors.push('จำนวนข้อที่สุ่มสอบมากกว่าจำนวนข้อสอบในคลัง');
    if (c.prerequisiteIds.includes(c.id)) errors.push('หลักสูตรตัวเองเป็นหลักสูตรก่อนหน้าไม่ได้');
    if (c.wiCode && (!c.skillType || !(c.skillToLevel >= 1 && c.skillToLevel <= 3) || !(c.skillFromLevel >= 0 && c.skillFromLevel < c.skillToLevel))) errors.push('สกิลเป้าหมาย: เลือกประเภทสกิล และระดับเป้าหมายต้องสูงกว่าระดับเริ่มต้น');
  }
  return [...new Set(errors)];
}
export function emptyCourse(now = new Date()): Course {
  const t = now.toISOString();
  return { id: uid('CRS'), code: '', title: '', description: '', category: COURSE_CATEGORIES[0], department: 'ALL', skillFromLevel: 0, skillToLevel: 0, instructor: '', mandatory: false, passScore: 80, maxAttempts: 3, questionsPerExam: 0,
    validityMonths: 12, sequential: true, prerequisiteIds: [], version: 1, status: 'draft', lessons: [], questions: [], createdAt: t, updatedAt: t, updatedBy: '' };
}
export function emptyLesson(type: LessonType): Lesson { return { id: uid('LSN'), title: '', type, durationMin: 10, objectives: [], body: '', videoUrl: '', requiredWatchPct: 90, checkpoints: [], minSeconds: type === 'article' ? 30 : 0 }; }
export function emptyQuestion(type: QuestionType = 'single'): Question {
  const base = { id: uid('Q'), type, text: '', correct: [0], points: 1, shuffle: true, explanation: '' };
  if (type === 'truefalse') return { ...base, choices: ['ถูก', 'ผิด'], shuffle: false };
  if (type === 'short') return { ...base, choices: [], correct: [], accepted: [''], shuffle: false };
  return { ...base, choices: ['', '', '', ''] };
}
/** เปลี่ยนชนิดข้อสอบโดยรักษาคำถามและตัวเลือกเดิมให้มากที่สุด */
export function changeQuestionType(q: Question, type: QuestionType): Question {
  if (q.type === type) return q;
  const fresh = emptyQuestion(type);
  const keepChoices = (type === 'single' || type === 'multiple') && q.choices.length >= 2 && q.type !== 'truefalse';
  return { ...fresh, id: q.id, text: q.text, image: q.image, points: q.points, explanation: q.explanation,
    ...(keepChoices ? { choices: q.choices, choiceImages: q.choiceImages, correct: type === 'single' ? q.correct.slice(0, 1) : q.correct } : {}) };
}
export function emptyCheckpoint(timeSec = 30): Checkpoint { return { id: uid('CP'), timeSec, question: '', choices: ['', '', ''], answerIndex: 0 }; }

function contentChanged(a: Course, b: Course) { return JSON.stringify([a.lessons, a.questions, a.passScore]) !== JSON.stringify([b.lessons, b.questions, b.passScore]); }
export function saveCourse(s: LmsState, role: Role, actorName: string, input: Course, publish = false, now = new Date()): LmsState {
  if (role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบที่จัดการหลักสูตรได้');
  const c: Course = { ...input, code: input.code.trim(), title: input.title.trim() };
  const errors = validateCourse(c, s.courses, publish || c.status === 'published');
  if (errors.length) throw new Error(errors[0]);
  const before = course(s, c.id);
  const bump = before && before.status === 'published' && contentChanged(before, c) ? 1 : 0;   // แก้เนื้อหาหลังเผยแพร่ = ออกเวอร์ชันใหม่ (ผู้เรียนเดิมยังอ้างเวอร์ชันที่เรียน)
  const saved: Course = { ...c, status: publish ? 'published' : c.status, version: (before?.version ?? c.version) + bump, createdAt: before?.createdAt ?? c.createdAt, updatedAt: now.toISOString(), updatedBy: actorName };
  return { ...s, courses: before ? s.courses.map(x => x.id === c.id ? saved : x) : [...s.courses, saved] };
}
export function setCourseStatus(s: LmsState, role: Role, actorName: string, id: string, status: CourseStatus, now = new Date()): LmsState {
  if (role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบที่จัดการหลักสูตรได้');
  const c = course(s, id); if (!c) throw new Error('ไม่พบหลักสูตร');
  if (status === 'published') { const errors = validateCourse(c, s.courses, true); if (errors.length) throw new Error(errors[0]); }
  return { ...s, courses: s.courses.map(x => x.id === id ? { ...x, status, updatedAt: now.toISOString(), updatedBy: actorName } : x) };
}
export function duplicateCourse(s: LmsState, role: Role, actorName: string, id: string, now = new Date()): LmsState {
  if (role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบที่จัดการหลักสูตรได้');
  const c = course(s, id); if (!c) throw new Error('ไม่พบหลักสูตร');
  let code = `${c.code}-COPY`; let n = 2; while (s.courses.some(x => x.code === code)) code = `${c.code}-COPY${n++}`;
  const copy: Course = { ...structuredClone(c), id: uid('CRS'), code, title: `${c.title} (สำเนา)`, status: 'draft', version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(), updatedBy: actorName };
  copy.lessons = copy.lessons.map(l => ({ ...l, id: uid('LSN'), checkpoints: l.checkpoints.map(k => ({ ...k, id: uid('CP') })) }));
  copy.questions = copy.questions.map(q => ({ ...q, id: uid('Q') }));
  return { ...s, courses: [...s.courses, copy] };
}
export function deleteCourse(s: LmsState, role: Role, id: string): LmsState {
  if (role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบที่จัดการหลักสูตรได้');
  if (s.enrollments.some(e => e.courseId === id)) throw new Error('หลักสูตรนี้มีประวัติการเรียนแล้ว ลบไม่ได้ ให้เก็บถาวรแทน');
  return { ...s, courses: s.courses.filter(c => c.id !== id).map(c => ({ ...c, prerequisiteIds: c.prerequisiteIds.filter(p => p !== id) })) };
}
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir; if (to < 0 || to >= list.length) return list;
  const copy = [...list]; [copy[index], copy[to]] = [copy[to], copy[index]]; return copy;
}

/* ---------- สถิติสำหรับรายงาน ---------- */
export function courseStats(s: LmsState, courseId: string, today = bkkDate()) {
  const list = s.enrollments.filter(e => e.courseId === courseId);
  const certified = list.filter(e => e.status === 'certified');
  const attempts = list.flatMap(e => e.attempts);
  return {
    enrolled: list.length, certified: certified.length, pending: list.filter(e => e.status === 'pending-chief').length,
    overdue: list.filter(e => isOverdue(e, today)).length, locked: list.filter(e => e.status === 'locked').length,
    completionRate: list.length ? Math.round((certified.length / list.length) * 100) : 0,
    avgScore: attempts.length ? Math.round(attempts.reduce((n, a) => n + a.score, 0) / attempts.length) : 0,
    passRate: attempts.length ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0,
  };
}
