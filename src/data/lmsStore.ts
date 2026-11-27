import { useSyncExternalStore } from 'react';
import { ACTORS, bangkokYear, employeesForYear, visibleEmployees } from './phase1Core';
import type { Role, SkillState } from './phase1Core';
import { decideSkillAdjustment, getSkillState, submitSkillAdjustment } from './phase1Store';
import * as core from './lmsCore';
import type { Answer, Course, CourseStatus, LmsState } from './lmsCore';
import { collectMediaRefs, gcMedia } from './lmsMedia';
import { lmsSeed } from './lmsSeed';
import { addDemoHistory } from './lmsDemoHistory';
import { addDemoCourses } from './lmsDemoCourses';
import { addDemoPractical } from './lmsDemoPractical';
import { addDemoMediaCourses } from './lmsDemoMedia';

const KEY = 'skillmatrix.lms.v1';
const REVISION = 7;
const listeners = new Set<() => void>();
let error = '';
let state: LmsState = { courses: [], enrollments: [] };

function load(): LmsState {
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data.courses) || !Array.isArray(data.enrollments)) throw new Error();
      if ((data.revision ?? 1) < REVISION) {
        let next: LmsState = { courses: data.courses, enrollments: data.enrollments };
        if ((data.revision ?? 1) < 4) { // v2: เป้าหมายสกิล · v3: ข้อสอบ · v4: ประวัติสำหรับ dashboard
          const seed = lmsSeed().courses;
          const courses = data.courses.map((c: Course) => ({ ...c, questions: c.questions.map(core.normalizeQuestion), skillFromLevel: c.skillFromLevel ?? seed.find(s => s.id === c.id)?.skillFromLevel ?? 0, skillToLevel: c.skillToLevel ?? seed.find(s => s.id === c.id)?.skillToLevel ?? 0, wiCode: c.wiCode ?? seed.find(s => s.id === c.id)?.wiCode, skillType: c.skillType ?? seed.find(s => s.id === c.id)?.skillType }));
          next = addDemoHistory({ courses, enrollments: data.enrollments });
        }
        next = addDemoMediaCourses(addDemoPractical(addDemoCourses(next))); // v5: หลักสูตรตัวอย่าง · v6: ฉากประเมินหน้างาน · v7: หลักสูตรสื่อครบ
        localStorage.setItem(KEY, JSON.stringify({ revision: REVISION, ...next }));
        return next;
      }
      return { courses: data.courses, enrollments: data.enrollments };
    }
    const fresh = addDemoMediaCourses(addDemoPractical(addDemoHistory(lmsSeed())));
    localStorage.setItem(KEY, JSON.stringify({ revision: REVISION, ...fresh }));
    return fresh;
  } catch {
    try { const fresh = addDemoMediaCourses(addDemoPractical(addDemoHistory(lmsSeed()))); localStorage.setItem(KEY, JSON.stringify({ revision: REVISION, ...fresh })); return fresh; }
    catch { error = 'อ่านข้อมูลระบบเรียนออนไลน์ไม่ได้ กรุณาตรวจสอบข้อมูลในเบราว์เซอร์'; return { courses: [], enrollments: [] }; }
  }
}
state = load();
function update(action: (current: LmsState) => LmsState) {
  if (error) throw new Error(error);
  const next = action(state);
  try { localStorage.setItem(KEY, JSON.stringify({ revision: REVISION, ...next })); } catch { throw new Error('บันทึกข้อมูลระบบเรียนออนไลน์ไม่ได้ กรุณาตรวจสอบพื้นที่จัดเก็บ'); }
  state = next; listeners.forEach(l => l());
}
window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { error = ''; state = load(); listeners.forEach(l => l()); } });

export function useLms() { return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => state); }
export function lmsStorageError() { return error; }

/* ผู้กระทำในโหมดสาธิต: ใช้ ACTORS เดิมของแต่ละบทบาท */
const learner = () => ({ id: ACTORS.staff.employeeId, name: ACTORS.staff.name, department: ACTORS.staff.department });
/** ลูกทีมตรงของ Chief (กติกาเดียวกับการเสนอปรับคะแนนสกิลและหน้าค้นหาบุคลากร) */
export function chiefTeam(skill: SkillState) { return visibleEmployees(employeesForYear(skill, bangkokYear()), 'chief'); }
const reportIds = () => chiefTeam(getSkillState()).map(e => e.id);
const chiefActor = () => ({ name: ACTORS.chief.name, reportIds: reportIds() });
const who = (role: Role) => ({ role, name: ACTORS[role].name, reportIds: role === 'chief' ? reportIds() : undefined });

export const lmsActions = {
  /** Staff สมัครเรียนเองจากคลังหลักสูตร (ไม่ต้องยื่นคำขอ) */
  selfEnroll: (courseId: string) => { let id = ''; update(s => { const next = core.enroll(s, learner(), courseId, who('staff')); id = next.enrollments[next.enrollments.length - 1].id; return next; }); return id; },
  assign: (courseId: string, role: Role, people: core.Learner[], dueDate?: string) => {
    const skipped: string[] = [];
    update(s => people.reduce((acc, p) => { try { return core.enroll(acc, p, courseId, who(role), { dueDate }); } catch (e) { skipped.push(`${p.name}: ${(e as Error).message}`); return acc; } }, s));
    return skipped;
  },
  completeLesson: (enrollmentId: string, lessonId: string, info?: { checkpointCorrect?: number; checkpointTotal?: number }) => update(s => core.completeLesson(s, enrollmentId, lessonId, info)),
  submitExam: (enrollmentId: string, answers: Record<string, Answer>) => { let attempt!: core.Attempt; update(s => { const r = core.submitExam(s, enrollmentId, answers); attempt = r.attempt; return r.state; }); return attempt; },
  certify: (id: string, approve: boolean, remark: string) => update(s => core.certifyResult(s, 'chief', chiefActor(), id, approve, remark)),
  unlock: (role: 'chief' | 'admin', id: string, note: string) => update(s => core.unlockAttempts(s, role, role === 'chief' ? chiefActor() : ACTORS.admin, id, note)),
  recordPractical: (id: string, input: { score: number; note: string; observedOn: string }) => {
    const sent = state.enrollments.find(x => x.id === id)?.proposal?.adjustmentId;
    if (sent && getSkillState().adjustments.some(a => a.id === sent && a.status === 'pending')) throw new Error('ข้อเสนอปรับระดับรอ Manager ยืนยันอยู่ ยังประเมินใหม่ไม่ได้');
    update(s => core.recordPractical(s, 'chief', chiefActor(), id, input));
  },
  /** ส่งข้อเสนอปรับระดับสกิลเข้าคิวอนุมัติของ Manager (ต้องผ่านประเมินหน้างานแล้ว) */
  proposeSkill: (id: string) => {
    const e = state.enrollments.find(x => x.id === id); const c = state.courses.find(x => x.id === e?.courseId);
    const key = c && core.skillKey(c);
    if (!e || !c || !key || !c.skillToLevel) throw new Error('ไม่พบรายการที่เสนอปรับระดับได้');
    if (!e.practical?.passed) throw new Error('ต้องผ่านการประเมินหน้างานก่อนจึงเสนอปรับระดับได้');
    const level = employeesForYear(getSkillState(), bangkokYear()).find(p => p.id === e.employeeId)?.scores[key] ?? 0;
    if (level >= c.skillToLevel) throw new Error(`ระดับปัจจุบัน Lv ${level} ถึงระดับเป้าหมายแล้ว ไม่ต้องเสนอปรับระดับ`);
    submitSkillAdjustment('chief', e.employeeId, { [key]: c.skillToLevel }, `สำเร็จหลักสูตร ${c.code} ${c.title} และผ่านประเมินหน้างาน`,
      `สอบออนไลน์ ${Math.max(...e.attempts.map(a => a.score))}% (${e.certificateNo}) · ปฏิบัติ ${e.practical.score}% วันที่ ${e.practical.observedOn}: ${e.practical.note}`);
    const sent = getSkillState().adjustments.filter(a => a.employeeId === e.employeeId && a.status === 'pending' && a.changes.some(x => x.key === key)).at(-1)!;
    update(s => core.markProposed(s, 'chief', chiefActor(), id, { adjustmentId: sent.id, level: c.skillToLevel }));
  },
  removeEnrollment: (id: string) => update(s => core.removeEnrollment(s, 'admin', id)),
  setDueDate: (role: 'chief' | 'admin', id: string, due: string) => update(s => core.setDueDate(s, role, ACTORS[role].name, id, due, new Date(), role === 'chief' ? reportIds() : [])),
  saveCourse: (course: Course, publish = false) => { update(s => core.saveCourse(s, 'admin', ACTORS.admin.name, course, publish)); void gcMedia(collectMediaRefs(state.courses)); },
  setCourseStatus: (id: string, status: CourseStatus) => update(s => core.setCourseStatus(s, 'admin', ACTORS.admin.name, id, status)),
  duplicateCourse: (id: string) => update(s => core.duplicateCourse(s, 'admin', ACTORS.admin.name, id)),
  deleteCourse: (id: string) => { update(s => core.deleteCourse(s, 'admin', id)); void gcMedia(collectMediaRefs(state.courses)); },
  /** เรียกหลังรีเซ็ตคะแนนสกิล เพื่อให้ฉากที่รอ Manager ถูกสร้างคู่กันใหม่ */
  resetDemo: () => { update(() => addDemoMediaCourses(addDemoPractical(addDemoHistory(lmsSeed())))); seedDemoProposals(); },
};

/** ฉากสาธิต "รอ Manager ยืนยัน" และ "Manager ไม่ยืนยัน": เสนอผ่านขั้นตอนจริงครั้งเดียว (มี proposal แล้วจะไม่ทำซ้ำ) */
function seedDemoProposals() {
  for (const id of ['ENR-DEMO-WAIT', 'ENR-DEMO-REJECT']) {
    const e = state.enrollments.find(x => x.id === id);
    if (!e || e.proposal) continue;
    try {
      lmsActions.proposeSkill(id);
      const sent = state.enrollments.find(x => x.id === id)?.proposal?.adjustmentId;
      if (id === 'ENR-DEMO-REJECT' && sent) decideSkillAdjustment('manager', sent, 'rejected', 'ขอให้สังเกตการปฏิบัติงานเพิ่มอีก 2 รอบก่อนปรับระดับ');
    } catch { /* ระดับสกิลถูกแก้ไปแล้วหรือมีคำขอค้างอยู่: ข้ามฉากสาธิตนี้ */ }
  }
}
seedDemoProposals();
