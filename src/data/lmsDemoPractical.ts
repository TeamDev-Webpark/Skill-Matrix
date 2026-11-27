/** ข้อมูลตัวอย่าง (โหมดสาธิต) ของหน้า "ประเมินหน้างานหลังเรียน" ให้เห็นครบทุกสถานะ
 *  ใช้ลูกทีมตรงของ Chief ตัวอย่าง (EMP001, EMP011) กับหลักสูตรผูกสกิลที่ระดับยังไม่ถึงเป้า */
import { ACTORS } from './phase1Core';
import { addMonths, bkkDate, saveCourse } from './lmsCore';
import type { Course, Enrollment, LmsState } from './lmsCore';

/** [รหัสอ้างอิง, รหัสหลักสูตร, W/I, ประเภท, จากระดับ, ถึงระดับ, ชื่อ, สาระสำคัญ] */
const COURSES = [
  ['CRS-OJT-DATA1', 'LMS-013', 'QCW001-001', 'D', 1, 2, 'การวิเคราะห์ค่าความต้านทานและฉนวน', 'บันทึกค่าพร้อมเงื่อนไขการวัด เทียบเกณฑ์ใน W/I และแจ้งค่าที่ผิดแนวโน้ม'],
  ['CRS-OJT-HV', 'LMS-014', 'QCW001-002', 'A', 0, 1, 'การต่อวงจรทดสอบแรงดันสูงอย่างปลอดภัย', 'ตรวจพื้นที่กั้นเขต ต่อสายดินก่อนต่อวงจร และให้ผู้ควบคุมตรวจก่อนจ่ายแรงดัน'],
  ['CRS-OJT-WELD', 'LMS-015', 'QCW002-001', 'D', 1, 2, 'การสรุปข้อมูลข้อบกพร่องรอยเชื่อม', 'จัดกลุ่มข้อบกพร่อง นับความถี่ และสรุปจุดที่พบซ้ำเพื่อส่งต่อฝ่ายผลิต'],
  ['CRS-OJT-LOSS', 'LMS-016', 'QCW004-001', 'D', 1, 2, 'การวิเคราะห์ค่าการสูญเสียไร้ภาระ', 'ปรับค่าตามเงื่อนไขอ้างอิง เทียบค่ารับประกัน และบันทึกเหตุผลเมื่อวัดซ้ำ'],
] as const;

/** สถานะที่ต้องการให้เห็น: waiting / rejected จะถูกเสนอให้ Manager ภายหลังใน lmsStore */
const CASES = [
  { id: 'ENR-DEMO-EVAL1', course: 'CRS-OJT-DATA1', employee: 'EMP001', name: 'นายสมชาย ใจดี', score: 90, days: 6 },
  { id: 'ENR-DEMO-EVAL2', course: 'CRS-OJT-HV', employee: 'EMP011', name: 'นายกฤษณะ แสงทอง', score: 85, days: 9 },
  { id: 'ENR-DEMO-FAILED', course: 'CRS-OJT-LOSS', employee: 'EMP011', name: 'นายกฤษณะ แสงทอง', score: 80, days: 24, practical: { score: 65, note: 'คำนวณค่าปรับแก้ผิด 2 จาก 5 ตัวอย่าง ให้ฝึกกับพี่เลี้ยงแล้วประเมินใหม่' } },
  { id: 'ENR-DEMO-PROPOSE', course: 'CRS-OJT-LOSS', employee: 'EMP001', name: 'นายสมชาย ใจดี', score: 100, days: 20, practical: { score: 92, note: 'วิเคราะห์ผลหม้อแปลง 5 เครื่องได้ถูกต้องครบ บันทึกเงื่อนไขการวัดชัดเจน' } },
  { id: 'ENR-DEMO-WAIT', course: 'CRS-OJT-WELD', employee: 'EMP001', name: 'นายสมชาย ใจดี', score: 95, days: 30, practical: { score: 88, note: 'สรุปข้อบกพร่องประจำสัปดาห์ได้เอง ตรวจทานกับบันทึกหน้างานแล้วตรงกัน' } },
  { id: 'ENR-DEMO-REJECT', course: 'CRS-OJT-DATA1', employee: 'EMP011', name: 'นายกฤษณะ แสงทอง', score: 80, days: 40, practical: { score: 82, note: 'อ่านค่าและเทียบเกณฑ์ได้ถูกต้องในงานที่สังเกต 1 รอบ' } },
];

export function addDemoPractical(state: LmsState, now = new Date()): LmsState {
  let next = state;
  for (const [id, code, wiCode, skillType, from, to, title, focus] of COURSES) {
    if (next.courses.some(c => c.id === id || c.code === code)) continue;
    const course: Course = {
      id, code, title, wiCode, skillType, skillFromLevel: from, skillToLevel: to, description: `${focus} ตาม W/I ${wiCode}`,
      category: 'คุณภาพ', department: 'QC Section', instructor: 'นางสาวอรุณี รักดี', mandatory: false, passScore: 80, maxAttempts: 3,
      questionsPerExam: 0, validityMonths: 12, sequential: true, prerequisiteIds: [], version: 1, status: 'draft',
      createdAt: '2026-09-01T03:00:00.000Z', updatedAt: '2026-09-01T03:00:00.000Z', updatedBy: '',
      lessons: ['หลักการและเกณฑ์ใน W/I', 'ตัวอย่างงานจริงและข้อควรระวัง'].map((name, i) => ({
        id: `${id}-L${i + 1}`, title: `บทที่ ${i + 1}: ${name}`, type: 'article' as const, durationMin: 12, objectives: [focus], checkpoints: [], minSeconds: 30,
        body: `${focus}\n- เปิด W/I ${wiCode} ฉบับปัจจุบันก่อนเริ่มงาน\n- บันทึกผลทันที ระบุหมายเลขชิ้นงานและเครื่องมือ\n- ค่าที่ผิดปกติให้หยุดและแจ้งหัวหน้างาน`,
      })),
      questions: [{
        id: `${id}-Q1`, type: 'single', text: 'พบค่าที่ผิดจากเกณฑ์ใน W/I ควรทำอย่างไรเป็นอันดับแรก', points: 1, shuffle: true, correct: [1],
        choices: ['ปรับค่าให้อยู่ในเกณฑ์', 'หยุด แยกชิ้นงาน และแจ้งหัวหน้างาน', 'ทำต่อแล้วค่อยรายงาน'], explanation: 'ต้องควบคุมชิ้นงานและแจ้งผู้มีอำนาจก่อน',
      }],
    };
    const by = ACTORS.admin.name; const at = new Date(course.createdAt);
    next = saveCourse(saveCourse(next, 'admin', by, course, false, at), 'admin', by, course, true, at);
  }

  const certCount = new Map<string, number>();
  for (const e of next.enrollments) { const year = e.certificateNo?.slice(5, 9); if (year) certCount.set(year, (certCount.get(year) ?? 0) + 1); }
  const added: Enrollment[] = [];
  for (const item of CASES) {
    const course = next.courses.find(c => c.id === item.course);
    if (!course || next.enrollments.some(e => e.id === item.id || (e.employeeId === item.employee && e.courseId === course.id))) continue;
    const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
    const passed = ago(item.days); const day = bkkDate(new Date(passed)); const year = day.slice(0, 4);
    certCount.set(year, (certCount.get(year) ?? 0) + 1);
    const chief = ACTORS.chief.name; const observed = ago(Math.max(1, item.days - 4));
    added.push({
      id: item.id, courseId: course.id, courseVersion: course.version, employeeId: item.employee, employeeName: item.name, department: 'QC Section',
      source: 'assigned', assignedBy: chief, enrolledAt: ago(item.days + 7), status: 'certified',
      lessonDone: Object.fromEntries(course.lessons.map(l => [l.id, { at: passed }])),
      attempts: [{ at: passed, score: item.score, correct: item.score >= 80 ? 1 : 0, total: 1, passed: true }], attemptsResetAt: 0, passedAt: passed,
      chiefName: chief, chiefReviewedAt: passed, certifiedAt: passed, certificateNo: `CERT-${year}-${String(certCount.get(year)).padStart(4, '0')}`,
      expiryDate: addMonths(day, course.validityMonths), events: [{ at: passed, actor: chief, action: 'รับรองผลการเรียน' }],
      practical: item.practical && { ...item.practical, passed: item.practical.score >= 80, observedOn: bkkDate(new Date(observed)), evaluatedBy: chief, evaluatedAt: observed },
    });
  }
  return { courses: next.courses, enrollments: [...next.enrollments, ...added] };
}
