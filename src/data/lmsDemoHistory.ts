/** ประวัติการเรียนตัวอย่าง (โหมดสาธิต) เพื่อให้ dashboard ของผู้บริหารมีข้อมูลหลายสถานะและหลายเดือน
 *  ไม่สร้างให้ลูกทีมตรงของ Chief ตัวอย่าง เพื่อไม่กระทบฉากสาธิตของ Staff / Chief */
import { initialState } from './phase1Core';
import { isChiefReport } from './teamScope';
import { addMonths, bkkDate } from './lmsCore';
import type { Course, Enrollment, LmsState } from './lmsCore';

const hash = (text: string) => { let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const DAY = 86400000;

export function addDemoHistory(state: LmsState, now = new Date()): LmsState {
  const people = initialState().snapshots[0].employees.filter(e => !isChiefReport(e) && !['EMP999', 'EMP-M01', 'EMP002', 'EMP003'].includes(e.id));
  const taken = new Set(state.enrollments.map(e => `${e.employeeId}|${e.courseId}`));
  const certCount = new Map<string, number>();
  for (const e of state.enrollments) { const year = e.certificateNo?.slice(5, 9); if (year) certCount.set(year, (certCount.get(year) ?? 0) + 1); }
  const added: Enrollment[] = [];
  // [รหัสหลักสูตร, สัดส่วนพนักงานกลุ่มเป้าหมายที่ลงทะเบียน (%)]
  for (const [courseId, reach] of [['CRS-SAFETY', 72], ['CRS-QC-MEASURE', 55], ['CRS-5S', 60]] as const) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) continue;
    for (const p of people) {
      if (course.department !== 'ALL' && course.department !== p.department) continue;
      const seed = hash(`${courseId}|${p.id}`);
      if (seed % 100 >= reach || taken.has(`${p.id}|${courseId}`)) continue;
      added.push(record(course, p, seed, now, certCount));
    }
  }
  return { courses: state.courses, enrollments: [...state.enrollments, ...added] };
}

function record(c: Course, p: { id: string; name: string; department: string }, seed: number, now: Date, certCount: Map<string, number>): Enrollment {
  const roll = (seed >>> 8) % 100;
  // ส่วนใหญ่ 0-5 เดือนล่าสุด ส่วนน้อยเกือบครบปี เพื่อให้มีใบรับรองใกล้หมดอายุ
  const old = (seed >>> 16) % 100 < 9;
  const daysAgo = old ? 335 + (seed % 50) : 4 + ((seed >>> 4) % 170);
  const at = (offset: number) => new Date(Math.min(now.getTime(), now.getTime() - daysAgo * DAY + offset * DAY));
  const status: Enrollment['status'] = old || roll < 62 ? 'certified' : roll < 70 ? 'pending-chief' : roll < 74 ? 'locked' : 'in-progress';
  const by = 'สมชาย วงศ์ไทย';
  const e: Enrollment = {
    id: `ENR-${c.id}-${p.id}`, courseId: c.id, courseVersion: c.version, employeeId: p.id, employeeName: p.name, department: p.department,
    source: seed % 3 === 0 ? 'self' : 'assigned', assignedBy: seed % 3 === 0 ? undefined : by, enrolledAt: at(0).toISOString(), status,
    lessonDone: {}, attempts: [], attemptsResetAt: 0, events: [{ at: at(0).toISOString(), actor: by, action: 'มอบหมายหลักสูตร' }],
  };
  const done = status === 'in-progress' ? c.lessons.slice(0, seed % Math.max(1, c.lessons.length)) : c.lessons;
  e.lessonDone = Object.fromEntries(done.map(l => [l.id, { at: at(2).toISOString() }]));
  const total = c.questions.length;
  const attempt = (score: number, offset: number) => ({ at: at(offset).toISOString(), score, correct: Math.round(total * score / 100), total, passed: score >= c.passScore });
  if (status === 'locked') e.attempts = Array.from({ length: c.maxAttempts }, (_, i) => attempt(33 + i * 17, 3 + i));
  if (status === 'certified' || status === 'pending-chief') {
    const hardCourse = c.id === 'CRS-QC-MEASURE' ? 45 : 18;      // สัดส่วนที่สอบครั้งแรกไม่ผ่าน
    e.attempts = [...((seed >>> 12) % 100 < hardCourse ? [attempt(50, 3)] : []), attempt(Math.min(100, c.passScore + ((seed >>> 20) % 5) * 5), 4)];
    e.passedAt = at(4).toISOString();
  }
  if (status === 'in-progress' && seed % 2 === 0) e.dueDate = bkkDate(new Date(now.getTime() + ((seed % 90) - 40) * DAY));
  if (status === 'certified') {
    const certified = at(6);
    const year = bkkDate(certified).slice(0, 4);
    certCount.set(year, (certCount.get(year) ?? 0) + 1);
    e.certifiedAt = e.chiefReviewedAt = certified.toISOString();
    e.chiefName = 'หัวหน้างาน (ข้อมูลตัวอย่าง)';
    e.certificateNo = `CERT-${year}-${String(certCount.get(year)).padStart(4, '0')}`;
    e.expiryDate = c.validityMonths ? addMonths(bkkDate(certified), c.validityMonths) : undefined;
    if (c.skillToLevel > 0 && (seed >>> 24) % 100 < 45) e.practical = { score: 80 + (seed % 5) * 4, passed: true, note: 'ปฏิบัติตาม W/I ครบถ้วน', observedOn: bkkDate(at(14)), evaluatedBy: e.chiefName, evaluatedAt: at(14).toISOString() };
  }
  return e;
}
