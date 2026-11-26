import { initialState } from './phase1Core';
import { isChiefReport } from './teamScope';
import type { Course, Enrollment, Lesson, LmsState, Question } from './lmsCore';
import { addMonths, bkkDate } from './lmsCore';
import { addDemoCourses } from './lmsDemoCourses';

const lesson = (id: string, title: string, durationMin: number, objectives: string[], body: string, minSeconds = 20, extra: Partial<Lesson> = {}): Lesson =>
  ({ id, title, type: 'article', durationMin, objectives, body, checkpoints: [], minSeconds, ...extra });
const q = (id: string, text: string, choices: string[], answerIndex: number, explanation: string): Question => ({ id, type: 'single', text, choices, correct: [answerIndex], points: 1, shuffle: false, explanation });

const NO_SKILL = { skillFromLevel: 0, skillToLevel: 0 };
const SAFETY: Course = {
  ...NO_SKILL,
  id: 'CRS-SAFETY', code: 'LMS-001', title: 'ความปลอดภัยในการทำงานเบื้องต้น', category: 'ความปลอดภัย', department: 'ALL', instructor: 'จป.วิชาชีพ',
  description: 'หลักสูตรบังคับสำหรับพนักงานทุกคน: อันตรายในโรงงาน อุปกรณ์ป้องกัน และขั้นตอนเมื่อเกิดเหตุฉุกเฉิน',
  mandatory: true, passScore: 80, maxAttempts: 3, questionsPerExam: 6, validityMonths: 12, sequential: true, prerequisiteIds: [], version: 1, status: 'published',
  lessons: [
    lesson('L-SAF-1', 'บทที่ 1: อันตรายในพื้นที่ทำงาน', 10, ['จำแนกอันตรายหลัก 4 กลุ่ม', 'รู้จักป้ายเตือนและสีความปลอดภัย'],
      'อันตรายในโรงงานแบ่งเป็น 4 กลุ่ม ได้แก่ กายภาพ เคมี ชีวภาพ และการยศาสตร์\n- กายภาพ: เสียงดัง ความร้อน เครื่องจักรหมุน ไฟฟ้า\n- เคมี: สารละลาย ไอระเหย ฝุ่น\n- การยศาสตร์: ท่าทางยก-ก้ม ซ้ำๆ เป็นเวลานาน\nป้ายสีแดง = ห้าม/อุปกรณ์ดับเพลิง · เหลือง = ระวัง · น้ำเงิน = ต้องปฏิบัติ · เขียว = ปลอดภัย/ทางหนีไฟ'),
    lesson('L-SAF-2', 'บทที่ 2: อุปกรณ์ป้องกันส่วนบุคคล (PPE)', 10, ['เลือก PPE ให้ตรงกับงาน', 'ตรวจสภาพ PPE ก่อนใช้'],
      'PPE คือด่านสุดท้ายของการป้องกัน ต้องเลือกให้เหมาะกับอันตราย\n- แว่นนิรภัย: งานเจียร ตัด เจาะ\n- ที่อุดหู/ครอบหู: พื้นที่เสียงเกิน 85 เดซิเบล\n- ถุงมือ: เลือกตามชนิดงาน (กันบาด กันสารเคมี กันไฟฟ้า)\n- รองเท้านิรภัย: พื้นที่ยกหรือเคลื่อนย้ายของหนัก\nตรวจสภาพก่อนใช้ทุกครั้ง ถ้าชำรุดให้เปลี่ยนและแจ้งหัวหน้างาน'),
    lesson('L-SAF-3', 'บทที่ 3: การรับมือเหตุฉุกเฉิน', 10, ['ทำตามลำดับเมื่อเกิดเพลิงไหม้', 'รู้จุดรวมพลและผู้ประสานงาน'],
      'เมื่อพบเหตุให้ทำตามลำดับ: 1) กดสัญญาณเตือน 2) แจ้งหัวหน้างานหรือทีมฉุกเฉิน 3) ดับไฟเบื้องต้นเมื่อปลอดภัยเท่านั้น 4) อพยพตามเส้นทางสีเขียวไปจุดรวมพล 5) เช็กชื่อและรอคำสั่ง\nห้ามใช้ลิฟต์ขณะเกิดเพลิงไหม้ และห้ามย้อนกลับไปเอาของ'),
  ],
  questions: [
    q('Q-SAF-1', 'ข้อใดจัดเป็นอันตรายกลุ่มการยศาสตร์', ['เสียงดังจากเครื่องปั๊ม', 'การยกของหนักด้วยท่าทางไม่เหมาะสมซ้ำๆ', 'ไอระเหยของตัวทำละลาย', 'กระแสไฟฟ้ารั่ว'], 1, 'การยศาสตร์เกี่ยวกับท่าทางและแรงที่กระทำต่อร่างกาย'),
    q('Q-SAF-2', 'ป้ายสีน้ำเงินในงานความปลอดภัยหมายถึงอะไร', ['ห้าม', 'ระวังอันตราย', 'ต้องปฏิบัติ', 'ทางหนีไฟ'], 2, 'น้ำเงินคือข้อบังคับให้ปฏิบัติ เช่น ต้องสวมแว่นตา'),
    q('Q-SAF-3', 'พื้นที่ที่มีเสียงเกิน 85 เดซิเบลควรสวมอะไร', ['แว่นนิรภัย', 'ที่อุดหูหรือครอบหู', 'ถุงมือผ้า', 'หมวกคลุมผม'], 1, 'เสียงเกิน 85 เดซิเบลเสี่ยงต่อการสูญเสียการได้ยิน'),
    q('Q-SAF-4', 'PPE ที่ชำรุดก่อนเริ่มงาน ควรทำอย่างไร', ['ใช้ต่อแล้วระวังเป็นพิเศษ', 'เปลี่ยนใหม่และแจ้งหัวหน้างาน', 'ซ่อมด้วยเทป', 'ยืมเพื่อนใช้แทนโดยไม่แจ้ง'], 1, 'อุปกรณ์ชำรุดห้ามใช้ ต้องเปลี่ยนและรายงาน'),
    q('Q-SAF-5', 'ขั้นแรกเมื่อพบเพลิงไหม้คืออะไร', ['ดับไฟเองทันทีทุกกรณี', 'กดสัญญาณเตือนและแจ้งผู้เกี่ยวข้อง', 'ถ่ายภาพส่งกลุ่มไลน์', 'รอให้ไฟสงบ'], 1, 'ต้องแจ้งเตือนให้ทุกคนทราบก่อน แล้วดับไฟเมื่อปลอดภัยเท่านั้น'),
    q('Q-SAF-6', 'ระหว่างอพยพจากเพลิงไหม้ ข้อใดห้ามทำ', ['เดินตามป้ายสีเขียว', 'ไปที่จุดรวมพล', 'ใช้ลิฟต์', 'แจ้งรายชื่อผู้ที่ยังไม่พบ'], 2, 'ห้ามใช้ลิฟต์เพราะไฟฟ้าอาจดับและติดอยู่ภายใน'),
    q('Q-SAF-7', 'ป้ายสีเหลืองหมายถึงอะไร', ['ระวังอันตราย', 'ห้ามเข้า', 'ปฐมพยาบาล', 'ต้องสวมหมวก'], 0, 'เหลืองคือเตือนให้ระวัง'),
    q('Q-SAF-8', 'PPE เป็นมาตรการระดับใดในลำดับการควบคุมอันตราย', ['ด่านแรก', 'ด่านสุดท้าย', 'ไม่จำเป็น', 'ใช้แทนการแก้ที่ต้นเหตุ'], 1, 'ควรลดอันตรายที่ต้นเหตุก่อน PPE คือด่านสุดท้าย'),
  ],
  createdAt: '2026-01-05T03:00:00.000Z', updatedAt: '2026-01-05T03:00:00.000Z', updatedBy: 'สมชาย วงศ์ไทย',
};

const QC: Course = {
  id: 'CRS-QC-MEASURE', code: 'LMS-002', title: 'การใช้เครื่องมือวัดและการตรวจสอบเบื้องต้น', category: 'คุณภาพ', department: 'QC Section', wiCode: 'QCW002-001', skillType: 'C', skillFromLevel: 1, skillToLevel: 2, instructor: 'หัวหน้าแผนก QC',
  description: 'ทบทวนหลักการวัด ความละเอียด และการบันทึกผล ก่อนปฏิบัติงานตรวจสอบตาม W/I',
  mandatory: false, passScore: 80, maxAttempts: 3, questionsPerExam: 0, validityMonths: 24, sequential: true, prerequisiteIds: [], version: 1, status: 'published',
  lessons: [
    lesson('L-QC-1', 'บทที่ 1: หลักการวัดและความละเอียดของเครื่องมือ', 12, ['เลือกเครื่องมือให้เหมาะกับค่าพิกัดเผื่อ', 'อ่านค่าได้ถูกต้อง'],
      'เครื่องมือวัดควรมีความละเอียดอย่างน้อย 1 ใน 10 ของพิกัดเผื่อของงาน\n- เวอร์เนียร์: ความละเอียด 0.02–0.05 มม.\n- ไมโครมิเตอร์: ความละเอียด 0.01 มม. หรือดีกว่า\nอ่านค่าตั้งฉากกับสเกล ทำความสะอาดผิวสัมผัส และวัดซ้ำอย่างน้อย 2 ครั้งเมื่อค่าใกล้ขอบพิกัด'),
    lesson('L-QC-2', 'บทที่ 2: การสอบเทียบและสถานะเครื่องมือ', 10, ['ตรวจสติกเกอร์สอบเทียบ', 'จัดการเครื่องมือที่หมดอายุ'],
      'ก่อนใช้เครื่องมือต้องตรวจป้ายสถานะ: วันที่สอบเทียบ วันครบกำหนด และผู้สอบเทียบ\nเครื่องมือหมดอายุหรือไม่มีป้าย ห้ามใช้ตรวจสอบงานและต้องแยกเก็บ พร้อมแจ้งหัวหน้างาน\nหากพบภายหลังว่าใช้เครื่องมือที่หมดอายุ ต้องทบทวนผลที่วัดตั้งแต่การสอบเทียบครั้งล่าสุด'),
    lesson('L-QC-3', 'บทที่ 3: การบันทึกผลและการรายงานความไม่ตรงตามข้อกำหนด', 8, ['บันทึกผลให้ตรวจสอบย้อนกลับได้', 'รู้ขั้นตอนแจ้ง NC'],
      'บันทึกผลทันทีด้วยปากกาหมึก ห้ามใช้น้ำยาลบ หากแก้ไขให้ขีดเส้นเดียวพร้อมลงชื่อและวันที่\nเมื่อพบค่านอกพิกัด: หยุดงาน แยกชิ้นงาน แจ้งหัวหน้า และเปิดใบ NC ตามขั้นตอน'),
  ],
  questions: [
    q('Q-QC-1', 'ความละเอียดของเครื่องมือควรเป็นเท่าใดของพิกัดเผื่อ', ['เท่ากับพิกัดเผื่อ', 'ประมาณ 1 ใน 10', 'ประมาณ 2 เท่า', 'ไม่จำเป็นต้องพิจารณา'], 1, 'หลักทั่วไปคือ 1:10'),
    q('Q-QC-2', 'ก่อนใช้เครื่องมือวัด ต้องตรวจสิ่งใดเป็นอันดับแรก', ['สีของเครื่องมือ', 'ป้ายสถานะการสอบเทียบ', 'ยี่ห้อ', 'ราคา'], 1, 'ต้องมั่นใจว่ายังอยู่ในกำหนดสอบเทียบ'),
    q('Q-QC-3', 'พบเครื่องมือหมดอายุสอบเทียบ ควรทำอย่างไร', ['ใช้ต่อได้ถ้าค่าดูปกติ', 'หยุดใช้ แยกเก็บ และแจ้งหัวหน้า', 'ติดป้ายใหม่เอง', 'ใช้ได้ถ้าวัดซ้ำสองครั้ง'], 1, 'ห้ามใช้เครื่องมือที่หมดอายุ'),
    q('Q-QC-4', 'หากแก้ไขค่าที่บันทึกผิด ควรทำอย่างไร', ['ใช้น้ำยาลบ', 'ขีดเส้นเดียว ลงชื่อและวันที่กำกับ', 'ฉีกแล้วเขียนใหม่', 'ปล่อยไว้'], 1, 'ต้องคงข้อมูลเดิมให้อ่านได้เพื่อการตรวจสอบย้อนกลับ'),
    q('Q-QC-5', 'วัดได้ค่านอกพิกัด ขั้นตอนแรกคืออะไร', ['ปรับค่าให้อยู่ในพิกัด', 'หยุดงาน แยกชิ้นงาน และแจ้งหัวหน้า', 'วัดจนกว่าจะผ่าน', 'ส่งต่อแผนกถัดไป'], 1, 'ต้องกันไม่ให้ชิ้นงานไม่ตรงข้อกำหนดไหลต่อ'),
    q('Q-QC-6', 'ควรวัดซ้ำเมื่อใด', ['เมื่อค่าใกล้ขอบพิกัด', 'ไม่ต้องวัดซ้ำ', 'เฉพาะเมื่อหัวหน้าสั่ง', 'เฉพาะงานเสร็จวันศุกร์'], 0, 'ค่าใกล้ขอบพิกัดมีความเสี่ยงจากความคลาดเคลื่อนในการอ่าน'),
  ],
  createdAt: '2026-02-10T03:00:00.000Z', updatedAt: '2026-02-10T03:00:00.000Z', updatedBy: 'สมชาย วงศ์ไทย',
};

const FIVE_S: Course = {
  id: 'CRS-5S', code: 'LMS-003', title: '5ส เพื่อพื้นที่ผลิตที่ปลอดภัยและมีประสิทธิภาพ', category: 'เทคนิคการผลิต', department: 'Production', wiCode: 'PROD-010-01', skillType: 'E', skillFromLevel: 0, skillToLevel: 1, instructor: 'ทีมปรับปรุงการผลิต',
  description: 'ปฏิบัติ 5ส อย่างต่อเนื่องในไลน์ผลิต ตั้งแต่สะสาง สะดวก สะอาด สุขลักษณะ และสร้างนิสัย',
  mandatory: false, passScore: 70, maxAttempts: 3, questionsPerExam: 0, validityMonths: 0, sequential: false, prerequisiteIds: [], version: 1, status: 'published',
  lessons: [
    lesson('L-5S-1', 'บทที่ 1: สะสาง และ สะดวก', 8, ['แยกของจำเป็นออกจากไม่จำเป็น', 'จัดวางให้หยิบใช้ได้ภายใน 30 วินาที'], 'สะสาง: แยกของที่ใช้ ไม่ใช้ และของเสีย ติดป้ายแดงสิ่งที่ไม่แน่ใจ\nสะดวก: กำหนดที่วาง ป้ายชื่อ และขอบเขตเส้นสีให้หยิบง่าย คืนง่าย'),
    lesson('L-5S-2', 'บทที่ 2: สะอาด สุขลักษณะ และสร้างนิสัย', 8, ['ทำความสะอาดพร้อมตรวจสภาพเครื่อง', 'ทำให้เป็นกิจวัตร'], 'สะอาด: ทำความสะอาดคือการตรวจเครื่องไปในตัว หาสาเหตุของรั่ว ซึม ฝุ่น\nสุขลักษณะ: ทำ 3 ส แรกให้คงอยู่ด้วยมาตรฐานภาพ\nสร้างนิสัย: ตรวจประเมินสม่ำเสมอ และยกย่องพื้นที่ต้นแบบ'),
  ],
  questions: [
    q('Q-5S-1', 'ป้ายแดงใช้เมื่อใด', ['ของไม่แน่ใจว่าจำเป็นหรือไม่', 'ของที่ใช้ทุกวัน', 'ของใหม่', 'ของที่ซ่อมเสร็จ'], 0, 'ป้ายแดงช่วยตัดสินใจร่วมกันก่อนทิ้งหรือย้าย'),
    q('Q-5S-2', 'ข้อใดคือจุดประสงค์ของ "สะดวก"', ['ตกแต่งให้สวยงาม', 'หยิบใช้และคืนได้ง่าย', 'ทิ้งของเก่า', 'ลดจำนวนพนักงาน'], 1, 'จัดวางให้ใช้งานง่ายและเห็นความผิดปกติได้ทันที'),
    q('Q-5S-3', 'การทำความสะอาดเครื่องจักรช่วยอะไรเพิ่มเติม', ['ไม่มี', 'พบความผิดปกติได้เร็ว', 'ทำให้เครื่องเร็วขึ้นเสมอ', 'ลดการบันทึก'], 1, 'การทำความสะอาดคือการตรวจสภาพ'),
    q('Q-5S-4', 'สุขลักษณะ (Seiketsu) หมายถึง', ['รักษา 3 ส แรกให้คงอยู่ด้วยมาตรฐาน', 'ซื้ออุปกรณ์ใหม่', 'ลงโทษคนไม่ทำ', 'จัดงานเลี้ยง'], 0, 'ทำให้ผลของ 3 ส แรกยั่งยืน'),
    q('Q-5S-5', 'การสร้างนิสัยควรมีอะไรสนับสนุน', ['การตรวจประเมินสม่ำเสมอ', 'ทำปีละครั้ง', 'ทำเมื่อมีผู้เยี่ยมชม', 'ปล่อยให้เป็นหน้าที่คนเดียว'], 0, 'ความสม่ำเสมอทำให้เกิดนิสัย'),
  ],
  createdAt: '2026-03-02T03:00:00.000Z', updatedAt: '2026-03-02T03:00:00.000Z', updatedBy: 'สมชาย วงศ์ไทย',
};

const DRAFT: Course = {
  ...NO_SKILL,
  id: 'CRS-DOC', code: 'LMS-004', title: 'การควบคุมเอกสารและบันทึกคุณภาพ (ฉบับร่าง)', category: 'ระบบและเอกสาร', department: 'ALL', instructor: '', description: 'กำลังจัดทำเนื้อหา',
  mandatory: false, passScore: 80, maxAttempts: 3, questionsPerExam: 0, validityMonths: 12, sequential: true, prerequisiteIds: ['CRS-SAFETY'], version: 1, status: 'draft',
  lessons: [lesson('L-DOC-1', 'บทที่ 1: ประเภทเอกสารในระบบคุณภาพ', 10, [], '')], questions: [],
  createdAt: '2026-04-01T03:00:00.000Z', updatedAt: '2026-04-01T03:00:00.000Z', updatedBy: 'สมชาย วงศ์ไทย',
};

export function lmsSeed(now = new Date()): LmsState {
  const courses = [SAFETY, QC, FIVE_S, DRAFT].map(c => structuredClone(c));
  const employees = initialState().snapshots[0].employees;
  const qc = employees.filter(e => e.department === 'QC Section' && !['EMP001', 'EMP002', 'EMP003'].includes(e.id));
  const mine = qc.filter(e => isChiefReport(e));          // ลูกทีมตรงของ Chief ตัวอย่าง
  const others = qc.filter(e => !isChiefReport(e));       // ทีมอื่น (เห็นเฉพาะ Admin)
  const t = now.toISOString(); const today = bkkDate(now);
  const base = (c: Course, e: { id: string; name: string; department: string }): Enrollment => ({
    id: `ENR-${c.id}-${e.id}`, courseId: c.id, courseVersion: c.version, employeeId: e.id, employeeName: e.name, department: e.department, source: 'assigned', assignedBy: 'สมชาย วงศ์ไทย',
    enrolledAt: t, status: 'in-progress', lessonDone: {}, attempts: [], attemptsResetAt: 0, events: [{ at: t, actor: 'สมชาย วงศ์ไทย', action: 'มอบหมายหลักสูตร' }],
  });
  const enrollments: Enrollment[] = [];
  // Staff ตัวอย่าง: กำลังเรียนหลักสูตรบังคับ (เรียนจบบทแรก) และมีกำหนดส่ง
  const staffSafety = base(SAFETY, { id: 'EMP001', name: 'นายสมชาย ใจดี', department: 'QC Section' });
  staffSafety.dueDate = addMonths(today, 1); staffSafety.lessonDone = { 'L-SAF-1': { at: t } };
  enrollments.push(staffSafety);
  // คนอื่นในแผนก QC: รอรับรอง / รับรองแล้ว
  if (mine[0]) { const e = base(QC, mine[0]); e.status = 'pending-chief'; e.lessonDone = Object.fromEntries(QC.lessons.map(l => [l.id, { at: t }])); e.attempts = [{ at: t, score: 83, correct: 5, total: 6, passed: true }]; e.passedAt = t; e.events.push({ at: t, actor: e.employeeName, action: 'สอบผ่านและส่งให้หัวหน้ารับรอง', note: '83% (5/6) ครั้งที่ 1/3' }); enrollments.push(e); }
  if (mine[1]) { const e = base(SAFETY, mine[1]); e.status = 'pending-chief'; e.lessonDone = Object.fromEntries(SAFETY.lessons.map(l => [l.id, { at: t }])); e.attempts = [{ at: t, score: 50, correct: 3, total: 6, passed: false }, { at: t, score: 100, correct: 6, total: 6, passed: true }]; e.passedAt = t; enrollments.push(e); }
  if (others[0]) { const e = base(SAFETY, others[0]); e.status = 'certified'; e.lessonDone = Object.fromEntries(SAFETY.lessons.map(l => [l.id, { at: t }])); e.attempts = [{ at: t, score: 100, correct: 6, total: 6, passed: true }]; e.passedAt = t; e.chiefName = 'หัวหน้าทีมอื่น'; e.chiefRemark = 'ผ่านเกณฑ์'; e.chiefReviewedAt = t; e.certifiedAt = t; e.certificateNo = `CERT-${today.slice(0, 4)}-0001`; e.expiryDate = addMonths(today, 12); enrollments.push(e); }
  if (mine[0]) { const e = base(SAFETY, mine[0]); e.status = 'locked'; e.lessonDone = Object.fromEntries(SAFETY.lessons.map(l => [l.id, { at: t }])); e.attempts = [0, 1, 2].map(() => ({ at: t, score: 33, correct: 2, total: 6, passed: false })); enrollments.push(e); }
  if (mine[1]) { const e = base(QC, mine[1]); e.status = 'certified'; e.lessonDone = Object.fromEntries(QC.lessons.map(l => [l.id, { at: t }])); e.attempts = [{ at: t, score: 100, correct: 6, total: 6, passed: true }]; e.passedAt = t; e.chiefName = 'นางสาวอรุณี รักดี'; e.chiefRemark = 'ผ่านเกณฑ์'; e.chiefReviewedAt = t; e.certifiedAt = t; e.certificateNo = `CERT-${today.slice(0, 4)}-0002`; e.expiryDate = addMonths(today, 24); enrollments.push(e); }
  return addDemoCourses({ courses, enrollments });
}
