/** ตัวเลขสำหรับ dashboard การเรียนออนไลน์ของผู้จัดการ (คำนวณอย่างเดียว ไม่แก้ข้อมูล) */
import { bkkDate, expiringSoon, isExpired, isOverdue, lessonsDone, skillKey } from './lmsCore';
import type { Course, Enrollment, LmsState } from './lmsCore';

export interface AnalyticsPerson { id: string; name: string; department: string; scores: Record<string, number> }
export interface AnalyticsAdjustment { id: string; status: 'pending' | 'approved' | 'rejected' }
export const COMPLIANCE_TARGET = 90;
const rate = (part: number, whole: number) => whole ? Math.round(part / whole * 100) : null;
const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function lmsAnalytics(
  lms: LmsState, people: AnalyticsPerson[], adjustments: AnalyticsAdjustment[],
  wis: { code: string; name: string; department: string; types: { code: string; label: string }[] }[],
  scope: { department: string; category: string }, now = new Date(),
) {
  const today = bkkDate(now);
  const staff = people.filter(p => scope.department === 'ALL' || p.department === scope.department);
  const ids = new Set(staff.map(p => p.id));
  const courses = lms.courses.filter(c => scope.category === 'ALL' || c.category === scope.category);
  const courseOf = new Map(courses.map(c => [c.id, c]));
  const rows = lms.enrollments.filter(e => ids.has(e.employeeId) && courseOf.has(e.courseId));
  const valid = (e: Enrollment) => e.status === 'certified' && !isExpired(e, today);

  // การอบรมบังคับ: นับเป็น "คน x หลักสูตร" ที่ต้องมีใบรับรองที่ยังไม่หมดอายุ
  const mandatory = courses.filter(c => c.mandatory && c.status === 'published');
  const holds = new Set(rows.filter(valid).map(e => `${e.employeeId}|${e.courseId}`));
  const required = staff.flatMap(p => mandatory.filter(c => c.department === 'ALL' || c.department === p.department).map(c => ({ p, c, ok: holds.has(`${p.id}|${c.id}`) })));
  const compliance = { required: required.length, done: required.filter(r => r.ok).length, rate: rate(required.filter(r => r.ok).length, required.length) };
  const departments = [...new Set(staff.map(p => p.department))].map(department => {
    const need = required.filter(r => r.p.department === department);
    const own = rows.filter(e => e.department === department);
    const headcount = staff.filter(p => p.department === department).length;
    return {
      department, headcount, learners: new Set(own.map(e => e.employeeId)).size,
      compliance: rate(need.filter(r => r.ok).length, need.length), missing: need.filter(r => !r.ok).length,
      certified: own.filter(valid).length, enrollments: own.length, overdue: own.filter(e => isOverdue(e, today)).length,
    };
  }).sort((a, b) => (a.compliance ?? 101) - (b.compliance ?? 101));

  const attempted = rows.filter(e => e.attempts.length);
  const kpi = {
    headcount: staff.length,
    learners: new Set(rows.map(e => e.employeeId)).size,
    enrollments: rows.length,
    certified: rows.filter(valid).length,
    completion: rate(rows.filter(valid).length, rows.length),
    firstPass: rate(attempted.filter(e => e.attempts[0].passed).length, attempted.length),
    overdue: rows.filter(e => isOverdue(e, today)).length,
  };

  // รายการที่ต้องติดตาม แยกตามเรื่องและผู้รับผิดชอบ
  const skillRows = rows.filter(e => skillKey(courseOf.get(e.courseId)!) && courseOf.get(e.courseId)!.skillToLevel > 0 && e.status === 'certified');
  const followUp = {
    overdue: rows.filter(e => isOverdue(e, today)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)),
    locked: rows.filter(e => e.status === 'locked'),
    pending: rows.filter(e => e.status === 'pending-chief').sort((a, b) => (a.passedAt ?? '').localeCompare(b.passedAt ?? '')),
    practical: skillRows.filter(e => !e.practical?.passed && (staff.find(p => p.id === e.employeeId)?.scores[skillKey(courseOf.get(e.courseId)!)!] ?? 0) < courseOf.get(e.courseId)!.skillToLevel),
    expiry: rows.filter(e => isExpired(e, today) || expiringSoon(e, 60, today)).sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!)),
  };

  const statusMix = [
    { key: 'certified', label: 'รับรองแล้ว', count: rows.filter(e => e.status === 'certified').length },
    { key: 'pending', label: 'รอหัวหน้ารับรอง', count: followUp.pending.length },
    { key: 'learning', label: 'กำลังเรียน', count: rows.filter(e => e.status === 'in-progress' || e.status === 'returned').length },
    { key: 'locked', label: 'ติดล็อก', count: followUp.locked.length },
  ];

  const finished = rows.filter(e => lessonsDone(courseOf.get(e.courseId)!, e) >= courseOf.get(e.courseId)!.lessons.length || e.status === 'certified' || e.status === 'pending-chief');
  const passed = rows.filter(e => e.status === 'certified' || e.status === 'pending-chief');
  const funnel = [
    { label: 'ลงทะเบียน', count: rows.length },
    { label: 'เรียนครบทุกบท', count: finished.length },
    { label: 'สอบผ่าน', count: passed.length },
    { label: 'หัวหน้ารับรอง', count: rows.filter(e => e.status === 'certified').length },
  ];
  const adjustmentStatus = (e: Enrollment) => e.proposal && adjustments.find(a => a.id === e.proposal!.adjustmentId)?.status;
  const transfer = [
    { label: 'รับรองแล้ว (หลักสูตรผูกสกิล)', count: skillRows.length },
    { label: 'ผ่านประเมินหน้างาน', count: skillRows.filter(e => e.practical?.passed).length },
    { label: 'เสนอปรับระดับ', count: skillRows.filter(e => e.proposal).length },
    { label: 'Manager ยืนยันระดับ', count: skillRows.filter(e => adjustmentStatus(e) === 'approved').length },
  ];
  const awaitingManager = skillRows.filter(e => adjustmentStatus(e) === 'pending').length;

  // 6 เดือนล่าสุด: ลงทะเบียนใหม่ เทียบกับรับรองผล
  const [year, month] = today.split('-').map(Number);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (5 - i), 1));
    const key = d.toISOString().slice(0, 7);
    const inMonth = (iso?: string) => !!iso && bkkDate(new Date(iso)).startsWith(key);
    return { key, month: monthNames[d.getUTCMonth()], enrolled: rows.filter(e => inMonth(e.enrolledAt)).length, certified: rows.filter(e => inMonth(e.certifiedAt)).length };
  });

  const courseRows = courses.filter(c => c.status === 'published' || rows.some(e => e.courseId === c.id)).map(c => {
    const own = rows.filter(e => e.courseId === c.id);
    const tried = own.filter(e => e.attempts.length);
    const attempts = own.flatMap(e => e.attempts);
    const firstPass = rate(tried.filter(e => e.attempts[0].passed).length, tried.length);
    const overdue = own.filter(e => isOverdue(e, today)).length;
    const locked = own.filter(e => e.status === 'locked').length;
    const completion = rate(own.filter(valid).length, own.length);
    const signal: { tone: 'red' | 'amber' | 'green' | 'slate'; label: string } = !own.length ? { tone: 'slate', label: 'ยังไม่มีผู้เรียน' }
      : tried.length >= 5 && firstPass !== null && firstPass < 65 ? { tone: 'red', label: 'ทบทวนเนื้อหาและข้อสอบ' }
      : overdue / own.length > 0.1 ? { tone: 'amber', label: 'เลยกำหนดสูง' }
      : completion !== null && completion < 50 ? { tone: 'amber', label: 'เรียนจบช้า' }
      : { tone: 'green', label: 'ปกติ' };
    return { course: c, enrolled: own.length, completion, firstPass, average: attempts.length ? Math.round(attempts.reduce((n, a) => n + a.score, 0) / attempts.length) : null, overdue, locked, signal };
  }).sort((a, b) => ['red', 'amber', 'green', 'slate'].indexOf(a.signal.tone) - ['red', 'amber', 'green', 'slate'].indexOf(b.signal.tone) || b.enrolled - a.enrolled);

  // ช่องว่างสกิล: คนที่ยังทำเองไม่ได้ (ต่ำกว่าระดับ 2) และมีหลักสูตรรองรับหรือไม่
  const gaps = wis.filter(w => scope.department === 'ALL' || w.department === scope.department).flatMap(w => w.types.map(t => {
    const key = `${w.code}_${t.code}`;
    const group = staff.filter(p => p.department === w.department);
    const below = group.filter(p => (p.scores[key] ?? 0) < 2);
    const course: Course | undefined = lms.courses.find(c => c.status === 'published' && skillKey(c) === key);
    const enrolled = course ? below.filter(p => lms.enrollments.some(e => e.courseId === course.id && e.employeeId === p.id)).length : 0;
    return { key, wiCode: w.code, wiName: w.name, type: t.code, typeLabel: t.label, department: w.department, people: group.length, below: below.length, share: rate(below.length, group.length) ?? 0, course, enrolled };
  })).filter(g => g.below > 0).sort((a, b) => b.below - a.below || a.key.localeCompare(b.key));

  return {
    today, rows, courseOf, mandatory, compliance, notCompliant: required.filter(r => !r.ok), departments, kpi, followUp, statusMix, funnel, transfer, awaitingManager, trend, courseRows,
    gaps, gapsWithoutCourse: gaps.filter(g => !g.course).length,
  };
}
