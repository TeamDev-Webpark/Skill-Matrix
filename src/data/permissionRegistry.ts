/** ทะเบียนส่วนประกอบของทุกหน้า ใช้สร้างตารางสิทธิ์ และเป็นรหัสที่หน้าจอตรวจด้วย <Can id="…">
 *  ทุกส่วนมีสิทธิ์ "ดู" เสมอ ส่วน สร้าง/แก้ไข/ลบ มีเฉพาะส่วนที่มีการกระทำนั้นจริง */
import { ROLE_PAGES } from './roleNavigation';
import type { Role } from './phase1Core';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';
export const PERM_ACTIONS: PermAction[] = ['view', 'create', 'edit', 'delete'];
export const ACTION_LABELS: Record<PermAction, string> = { view: 'ดู', create: 'สร้าง', edit: 'แก้ไข', delete: 'ลบ' };
export interface PermComponent { id: string; label: string; actions: PermAction[]; hints?: Partial<Record<PermAction, string>> }

const c = (id: string, label: string, hints: Partial<Record<Exclude<PermAction, 'view'>, string>> = {}): PermComponent =>
  ({ id, label, actions: ['view', ...(['create', 'edit', 'delete'] as const).filter(a => hints[a])], hints });

const header = c('header', 'หัวข้อและคำอธิบายหน้า');
const filters = c('filters', 'ตัวกรองและการค้นหา');
const metrics = c('metrics', 'ตัวเลขสรุป');

const yearly = [header, filters, metrics, c('chart', 'กราฟแนวโน้ม'), c('table', 'ตารางคะแนนรายคน'), c('history', 'ประวัติการพิจารณาคะแนน')];
const matrix = [header, filters, c('options', 'รูปแบบการแสดงผลและคำอธิบายระดับ'), c('profile', 'สรุปพนักงานที่เลือก'), c('content', 'ตารางหรือการ์ดคะแนน')];
const compare = [header, c('mode', 'ปุ่มเลือกโหมดเปรียบเทียบ'), filters, metrics, c('chart', 'กราฟเปรียบเทียบ'), c('table', 'ตารางเปรียบเทียบ')];
const jobSummary = [header, c('export', 'ปุ่มส่งออกและพิมพ์'), filters, metrics, c('summary', 'ตารางสรุปตาม W/I'), c('details', 'รายละเอียดพนักงานตามงาน')];
const directory = [header, filters, c('table', 'ตารางรายชื่อพนักงาน')];
const talent = [header, c('criteria', 'เงื่อนไขการค้นหา'), c('summary', 'จำนวนตามระดับสกิล'), c('results', 'ผลการค้นหา'), c('export', 'ปุ่มส่งออก CSV')];
const skillApprovals = [header, filters, c('list', 'รายการคำขอปรับคะแนน', { edit: 'ปรับคะแนน อนุมัติ หรือไม่อนุมัติ' })];

export const PAGE_COMPONENTS: Record<string, PermComponent[]> = {
  // ---------- Staff ----------
  'staff-home': [c('hero', 'แถบต้อนรับและหลักสูตรที่ควรทำต่อ'), c('stats', 'ตัวเลขสรุปของฉัน'), c('learning', 'เรียนออนไลน์ของฉัน'), c('recommended', 'หลักสูตรแนะนำ', { create: 'สมัครเรียน' }), c('training', 'การฝึกอบรมของฉัน', { create: 'ยื่นขอฝึกอบรม' }), c('todo', 'สิ่งที่ต้องติดตาม'), c('levels', 'ระดับสกิลของฉัน'), c('certificates', 'ใบรับรองล่าสุด')],
  'staff-my-skills': [header, c('profile', 'ข้อมูลของฉัน'), metrics, filters, c('legend', 'คำอธิบายระดับสกิล'), c('table', 'ตารางคะแนนของฉัน')],
  'staff-yearly': yearly,
  'staff-training-request': [header, c('form', 'ฟอร์มยื่นคำขอ', { create: 'ส่งคำขอฝึกอบรม' })],
  'staff-training-tracking': [header, c('new', 'ปุ่มยื่นคำขอใหม่', { create: 'ยื่นคำขอใหม่' }), c('list', 'รายการคำขอของฉัน')],
  'staff-training-results': [header, metrics, c('list', 'ผลฝึกอบรม')],
  'staff-lms-learning': [header, metrics, c('list', 'การ์ดหลักสูตรของฉัน', { edit: 'เข้าเรียนและทำแบบทดสอบ' })],
  'staff-lms-catalog': [header, c('recommended', 'หลักสูตรแนะนำ', { create: 'สมัครเรียน' }), c('status', 'แท็บสถานะการลงเรียน'), filters, c('list', 'การ์ดหลักสูตร', { create: 'สมัครเรียนหรือเข้าเรียน' })],
  'staff-lms-certificates': [header, c('list', 'รายการใบรับรอง')],
  // ---------- Chief ----------
  'chief-home': [header, metrics, c('shortcuts', 'ปุ่มลัด'), c('readiness', 'กราฟความพร้อมของทีม'), c('stages', 'กราฟสถานะงานฝึกอบรม'), c('coverage', 'กราฟสกิลที่ควรเตรียมคนแทน'), c('trend', 'กราฟแนวโน้มคะแนน'), c('queue', 'ลำดับงานที่ควรดำเนินการ')],
  'chief-training-requests': [header, metrics, c('list', 'คำขอที่รอตรวจ', { edit: 'อนุมัติหรือไม่อนุมัติคำขอ' })],
  'chief-training-evaluation': [header, c('list', 'รายการรอบันทึกผล', { create: 'บันทึกผลประเมิน' })],
  'chief-lms-certify': [header, c('queue', 'ผลเรียนที่รอรับรอง', { edit: 'รับรองหรือส่งกลับ' }), c('history', 'การตัดสินล่าสุด')],
  'chief-lms-practical': [header, metrics, c('queue', 'รายการประเมินหน้างาน', { create: 'บันทึกผลและเสนอปรับระดับ' }), c('done', 'รายการที่ดำเนินการแล้ว')],
  'chief-lms-progress': [header, metrics, c('assign', 'ฟอร์มมอบหมายหลักสูตร', { create: 'มอบหมายหลักสูตร' }), c('learners', 'ตารางสถานะการเรียน', { edit: 'ปลดล็อกสิทธิ์สอบ' })],
  'chief-talent-finder': talent,
  'chief-individual-scores': [header, filters, c('table', 'ตารางคะแนนรายบุคคล', { edit: 'แก้ไขคะแนนแบบแมนนวล' }), c('propose', 'กล่องส่งคำขอเปลี่ยนคะแนน', { create: 'ส่งคำขอให้ผู้จัดการ' }), c('history', 'ประวัติคำขอเปลี่ยนคะแนน')],
  'chief-team-skills': matrix,
  'chief-compare': compare,
  'chief-yearly': yearly,
  'chief-job-summary': jobSummary,
  'chief-team-directory': directory,
  // ---------- Manager ----------
  'manager-home': [header, c('actions', 'ปุ่มไปหน้าประเมินและเปรียบเทียบ'), filters, metrics, c('departments', 'กราฟความพร้อมรายแผนก'), c('levels', 'กราฟการกระจายระดับสกิล'), c('trend', 'กราฟแนวโน้มคะแนน'), c('types', 'กราฟระดับเฉลี่ยตามประเภท'), c('training', 'กราฟภาพรวมการฝึกอบรม'), c('requests', 'กราฟคำขอปรับคะแนน'), c('risk', 'สกิลที่ควรวางแผนพัฒนา'), c('shortcuts', 'การ์ดทางลัดด้านล่าง')],
  'manager-skill-approvals': skillApprovals,
  'manager-training-approvals': [header, metrics, c('list', 'ผลอบรมที่รอรับรอง', { edit: 'รับรองหรือไม่รับรองผล' })],
  'manager-lms-dashboard': [header, c('filters', 'ตัวกรองและปุ่มส่งออกสรุป'), c('headline', 'ตัวชี้วัดหลัก'), c('departments', 'อบรมบังคับรายแผนก'), c('status', 'สถานะการเรียนตอนนี้'), c('followup', 'รายการที่ต้องติดตาม'), c('trend', 'แนวโน้ม 6 เดือน'), c('funnel', 'ขั้นการเรียนและการยกระดับสกิล'), c('courses', 'ประสิทธิผลรายหลักสูตร'), c('gaps', 'ช่องว่างสกิล')],
  'manager-talent-finder': talent,
  'manager-individual-scores': matrix,
  'manager-section-skills': matrix,
  'manager-compare': compare,
  'manager-assessment-individual': [c('header', 'หัวข้อและปุ่มส่งออก'), filters, c('profile', 'ข้อมูลพนักงานที่ประเมิน'), metrics, c('types', 'สรุปคะแนนตามประเภทสกิล'), c('guide', 'คำแนะนำการอ่านผลและสูตร'), c('details', 'รายละเอียดคะแนนตามงาน')],
  'manager-assessment-section': [c('header', 'หัวข้อและปุ่มส่งออก'), filters, metrics, c('compare', 'เปรียบเทียบคะแนนแต่ละแผนก'), c('details', 'รายชื่อและคะแนนรายแผนก'), c('guide', 'สูตรและคำอธิบาย')],
  'manager-yearly': yearly,
  'manager-job-summary': jobSummary,
  'manager-people-directory': directory,
  // ---------- Admin ----------
  'admin-home': [header, metrics, c('attention', 'เรื่องที่ควรตรวจ'), c('departments', 'พนักงานแยกตามแผนก'), c('learning', 'สถานะการเรียนออนไลน์'), c('activity', 'ความเคลื่อนไหวล่าสุด'), c('shortcuts', 'ทางลัด')],
  'admin-employees': [header, c('actions', 'ปุ่มนำเข้าและเพิ่มพนักงาน', { create: 'นำเข้า Excel / เพิ่มพนักงาน' }), filters, c('table', 'ตารางพนักงาน', { edit: 'แก้ไขข้อมูลพนักงาน' }), c('history', 'ปุ่มประวัติการโอนย้าย')],
  'admin-master-data': [header, c('wi', 'ตาราง Work Instruction', { create: 'เพิ่ม W/I', edit: 'แก้ไข W/I', delete: 'เก็บถาวร W/I' }), c('types', 'Skill Types Master', { create: 'เพิ่มประเภทสกิล', edit: 'แก้ไขประเภทสกิล', delete: 'เก็บถาวรประเภทสกิล' })],
  'admin-skill-audit': skillApprovals,
  'admin-training-audit': [header, filters, c('list', 'ประวัติฝึกอบรม')],
  'admin-reports': jobSummary,
  'admin-lms-courses': [header, c('create', 'ปุ่มสร้างหลักสูตร', { create: 'สร้างหลักสูตรใหม่' }), metrics, filters, c('list', 'รายการหลักสูตร', { create: 'ทำสำเนาหลักสูตร', edit: 'แก้ไข เผยแพร่ ถอน เก็บถาวร', delete: 'ลบหลักสูตร' })],
  'admin-lms-enrollments': [header, c('assign', 'ฟอร์มมอบหมายหลักสูตร', { create: 'มอบหมายหลักสูตร' }), c('learners', 'ตารางรายการผู้เรียน', { edit: 'ปลดล็อกสิทธิ์สอบ', delete: 'ยกเลิกการลงทะเบียน' })],
  'admin-lms-reports': [header, c('export', 'ปุ่มส่งออก CSV'), metrics, c('courses', 'ตารางแยกตามหลักสูตร'), c('departments', 'ตารางแยกตามแผนก'), c('expiring', 'ใบรับรองใกล้หมดอายุ')],
  'admin-settings': [header, c('reset', 'ปุ่มรีเซ็ตข้อมูล', { delete: 'รีเซ็ตข้อมูลระบบ' }), c('info', 'คำอธิบายพื้นที่ตามบทบาท'), c('table', 'ตารางหน้าที่แต่ละบทบาท')],
  'admin-permissions': [c('manage', 'จัดการบทบาทและสิทธิ์')],
};

/** หน้านี้ผู้ดูแลระบบหลักเข้าได้เสมอ กันการปิดสิทธิ์ตัวเองจนแก้คืนไม่ได้ */
export const LOCKED_PAGE = 'admin-permissions';
export const pagesOf = (base: Role) => ROLE_PAGES[base];
export const componentsOf = (pageId: string) => PAGE_COMPONENTS[pageId] ?? [];
