import { bangkokYear, employeesForYear } from './phase1Core';
import type { SkillState } from './phase1Core';
import { practicalStage, skillKey } from './lmsCore';
import type { Course, Enrollment, LmsState, PracticalStage } from './lmsCore';

export interface PracticalItem { e: Enrollment; c: Course; level: number; stage: PracticalStage; adjustment?: SkillState['adjustments'][number] }
/** รวมข้อมูล LMS กับ Skill Matrix: ระดับปัจจุบันและผลคำขอปรับคะแนนของแต่ละรายการ */
export function practicalItem(lms: LmsState, skill: SkillState, e: Enrollment): PracticalItem | undefined {
  const c = lms.courses.find(x => x.id === e.courseId); const key = c && skillKey(c);
  if (!c || !key) return undefined;
  const level = employeesForYear(skill, bangkokYear()).find(p => p.id === e.employeeId)?.scores[key] ?? 0;
  const adjustment = e.proposal ? skill.adjustments.find(a => a.id === e.proposal!.adjustmentId) : undefined;
  const stage = practicalStage(c, e, level, adjustment?.status);
  return stage === 'none' ? undefined : { e, c, level, stage, adjustment };
}
export function practicalQueue(lms: LmsState, skill: SkillState, employeeIds: Set<string>): PracticalItem[] {
  return lms.enrollments.filter(e => e.status === 'certified' && employeeIds.has(e.employeeId)).flatMap(e => practicalItem(lms, skill, e) ?? []);
}
