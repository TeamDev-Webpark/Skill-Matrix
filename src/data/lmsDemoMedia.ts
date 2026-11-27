/** หลักสูตรตัวอย่าง (โหมดสาธิต) ที่ใช้สื่อครบ: วิดีโอพร้อมจุดคำถาม รูปประกอบ เอกสาร PDF และข้อสอบหลายชนิด
 *  ไฟล์สื่ออยู่ใน public/demo-lms (สร้างด้วย scripts/make-lms-demo-media.mjs) */
import { ACTORS } from './phase1Core';
import { saveCourse } from './lmsCore';
import type { Attachment, Course, Lesson, LmsState, Question } from './lmsCore';

const file = (name: string) => `/demo-lms/${name}`;
const pdf = (id: string, name: string, path: string): Attachment => ({ id, kind: 'pdf', name, ref: file(path) });
const picture = (id: string, name: string, path: string): Attachment => ({ id, kind: 'image', name, ref: file(path) });
const lesson = (id: string, title: string, type: Lesson['type'], extra: Partial<Lesson>): Lesson =>
  ({ id, title, type, durationMin: 5, objectives: [], body: '', videoUrl: '', requiredWatchPct: 90, checkpoints: [], minSeconds: type === 'article' ? 15 : 0, ...extra });
const question = (id: string, type: Question['type'], text: string, extra: Partial<Question>): Question =>
  ({ id, type, text, choices: [], correct: [], points: 1, shuffle: type === 'single' || type === 'multiple', explanation: '', ...extra });

type Draft = Pick<Course, 'id' | 'code' | 'title' | 'description' | 'wiCode' | 'skillType' | 'lessons' | 'questions'>;
const DRAFTS: Draft[] = [
  {
    id: 'CRS-MEDIA-WELD', code: 'LMS-017', title: 'การตรวจรอยเชื่อมด้วยสายตา (วิดีโอ รูป และเอกสาร)', wiCode: 'QCW002-001', skillType: 'C',
    description: 'ดูวิดีโอขั้นตอนตรวจ เทียบภาพข้อบกพร่องจริง อ่านเกณฑ์การยอมรับ แล้วทำแบบทดสอบที่มีคำถามแบบรูปภาพ',
    lessons: [
      lesson('L-MW-1', 'บทที่ 1: ขั้นตอนการตรวจ (วิดีโอ)', 'video', {
        videoUrl: file('weld-inspection.webm'), durationMin: 1, objectives: ['บอกสิ่งที่ต้องเตรียมก่อนตรวจ', 'บอกการดำเนินการเมื่อพบของเสีย'],
        body: 'วิดีโอนี้มีจุดคำถามระหว่างดู ต้องตอบก่อนจึงดูต่อได้',
        checkpoints: [{ id: 'CP-MW-1', timeSec: 15, question: 'แสงสว่างขั้นต่ำสำหรับการตรวจคือเท่าใด', choices: ['100 ลักซ์', '500 ลักซ์', '50 ลักซ์'], answerIndex: 1, explanation: 'ตามวิดีโอตอนที่ 2' }],
      }),
      lesson('L-MW-2', 'บทที่ 2: รู้จักข้อบกพร่องจากภาพ', 'article', {
        objectives: ['แยกแยะรูพรุน รอยแหว่งขอบ และรอยร้าว'],
        body: `## รอยเชื่อมที่ดี
แนวเชื่อมสม่ำเสมอ ผิวเรียบ ไม่มีรูหรือรอยแยก
![ตัวอย่าง A: รอยเชื่อมปกติ](${file('weld-good.png')})
## ข้อบกพร่องที่พบบ่อย
![ตัวอย่าง B: รูพรุน (Porosity)](${file('weld-porosity.png')})
![ตัวอย่าง C: รอยแหว่งขอบ (Undercut)](${file('weld-undercut.png')})
![ตัวอย่าง D: รอยร้าว (Crack)](${file('weld-crack.png')})
## ลำดับเมื่อพบของเสีย
1. หยุดและแยกชิ้นงาน
2. ติดป้ายชี้บ่งว่ารอตัดสิน
3. บันทึกผลและแจ้งหัวหน้างาน
> **รอยร้าวไม่ยอมรับทุกขนาด** ห้ามเจียรซ่อนรอยก่อนรายงาน`,
      }),
      lesson('L-MW-3', 'บทที่ 3: เกณฑ์การยอมรับ (อ่านเอกสาร)', 'article', {
        body: 'เปิดอ่านเอกสารเกณฑ์การยอมรับให้ครบ และดาวน์โหลดแบบบันทึกผลไว้ใช้หน้างาน', requireOpen: true,
        attachments: [pdf('ATT-MW-1', 'เกณฑ์การยอมรับรอยเชื่อม', 'weld-acceptance.pdf'), pdf('ATT-MW-2', 'แบบบันทึกผลตรวจรอยเชื่อม', 'weld-checksheet.pdf')],
      }),
    ],
    questions: [
      question('Q-MW-1', 'single', 'ข้อบกพร่องในภาพคืออะไร', { image: file('weld-porosity.png'), choices: ['รอยร้าว', 'รูพรุน', 'รอยแหว่งขอบ', 'รอยเชื่อมปกติ'], correct: [1], explanation: 'จุดกลมดำกระจายในแนวเชื่อมคือรูพรุน' }),
      question('Q-MW-2', 'single', 'ภาพใดคือรอยร้าว', { choices: ['ภาพที่ 1', 'ภาพที่ 2', 'ภาพที่ 3'], choiceImages: [file('weld-undercut.png'), file('weld-crack.png'), file('weld-good.png')], correct: [1], points: 2, explanation: 'รอยแยกเป็นเส้นหยักคือรอยร้าว' }),
      question('Q-MW-3', 'multiple', 'สิ่งใดต้องทำก่อนเริ่มตรวจ', { choices: ['เตรียมแสงสว่างให้พอ', 'ทำความสะอาดแนวเชื่อม', 'ทาสีทับแนวเชื่อม', 'เตรียมเกจวัด'], correct: [0, 1, 3], points: 3, partial: true }),
      question('Q-MW-4', 'truefalse', 'รอยร้าวขนาดเล็กกว่า 1 มม. ยอมรับได้', { choices: ['ถูก', 'ผิด'], correct: [1], explanation: 'ไม่ยอมรับทุกขนาด' }),
      question('Q-MW-5', 'short', 'รอยแหว่งขอบยอมรับความลึกได้ไม่เกินกี่มิลลิเมตร (ตอบเป็นตัวเลข)', { accepted: ['0.5', '0.5 มม.', '.5'], points: 2, explanation: 'ดูเอกสารเกณฑ์การยอมรับข้อ 2' }),
    ],
  },
  {
    id: 'CRS-MEDIA-HV', code: 'LMS-018', title: 'ความปลอดภัยการทดสอบแรงดันสูง (วิดีโอ และคู่มือ)', wiCode: 'QCW001-002', skillType: 'B',
    description: 'ทบทวนลำดับก่อน ระหว่าง และหลังจ่ายแรงดัน พร้อมผังเขตกั้นและคู่มือความปลอดภัยฉบับ PDF',
    lessons: [
      lesson('L-MH-1', 'บทที่ 1: ลำดับความปลอดภัย (วิดีโอ)', 'video', {
        videoUrl: file('hv-safety.webm'), durationMin: 1, objectives: ['เรียงลำดับก่อนและหลังจ่ายแรงดันได้ถูกต้อง'],
        checkpoints: [{ id: 'CP-MH-1', timeSec: 23, question: 'หลังทดสอบเสร็จ ต้องทำอะไรก่อนสัมผัสชิ้นงาน', choices: ['คายประจุ', 'ถอดป้ายเตือน', 'บันทึกผล'], answerIndex: 0 }],
      }),
      lesson('L-MH-2', 'บทที่ 2: ผังเขตทดสอบและคู่มือ', 'article', {
        body: `## ผังเขตทดสอบ
ศึกษาตำแหน่งโต๊ะควบคุม เขตกั้น และจุดต่อสายดินจากภาพแนบ
- ก่อนจ่ายไฟ: ต่อสายดินและตรวจว่าไม่มีคนในเขตกั้น
- ระหว่างทดสอบ: ห้ามเข้าเขตกั้นทุกกรณี
- หลังทดสอบ: คายประจุก่อนสัมผัส
> ระยะกั้นขั้นต่ำขึ้นกับระดับแรงดัน ให้เปิดคู่มือตรวจสอบทุกครั้ง`,
        attachments: [picture('ATT-MH-1', 'ผังเขตกั้นทดสอบแรงดันสูง', 'hv-area.png'), pdf('ATT-MH-2', 'ขั้นตอนความปลอดภัยการทดสอบแรงดันสูง', 'hv-safety.pdf')], requireOpen: true,
      }),
    ],
    questions: [
      question('Q-MH-1', 'single', 'จากผังนี้ เส้นสีเขียวคืออะไร', { image: file('hv-area.png'), choices: ['สายไฟแรงสูง', 'สายดิน', 'สายสัญญาณ'], correct: [1] }),
      question('Q-MH-2', 'single', 'แรงดันทดสอบ 35 kV ต้องกั้นระยะอย่างน้อยเท่าใด', { choices: ['1.0 เมตร', '2.0 เมตร', '3.0 เมตร'], correct: [1], explanation: 'ช่วง 10–50 kV ใช้ 2.0 เมตร' }),
      question('Q-MH-3', 'multiple', 'ข้อใดต้องทำหลังทดสอบเสร็จ', { choices: ['ลดแรงดันเป็นศูนย์', 'คายประจุ', 'เข้าไปจับชิ้นงานทันที', 'บันทึกผล'], correct: [0, 1, 3], points: 2 }),
      question('Q-MH-4', 'truefalse', 'ต่อสายดินหลังจ่ายแรงดันแล้วก็ได้', { choices: ['ถูก', 'ผิด'], correct: [1], explanation: 'ต้องต่อสายดินก่อนเสมอ' }),
    ],
  },
];

export function addDemoMediaCourses(state: LmsState): LmsState {
  let next = state;
  for (const draft of DRAFTS) {
    if (next.courses.some(c => c.id === draft.id || c.code === draft.code)) continue;
    const at = new Date('2026-11-01T03:00:00.000Z');
    const course: Course = {
      ...structuredClone(draft), category: 'คุณภาพ', department: 'QC Section', instructor: 'นางสาวอรุณี รักดี', mandatory: false,
      skillFromLevel: 1, skillToLevel: 2, passScore: 70, maxAttempts: 3, questionsPerExam: 0, validityMonths: 12, sequential: true,
      prerequisiteIds: [], version: 1, status: 'draft', createdAt: at.toISOString(), updatedAt: at.toISOString(), updatedBy: '',
    };
    next = saveCourse(saveCourse(next, 'admin', ACTORS.admin.name, course, false, at), 'admin', ACTORS.admin.name, course, true, at);
  }
  return next;
}
