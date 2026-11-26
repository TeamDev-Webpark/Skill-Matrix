import { Printer } from 'lucide-react';
import type { Course, Enrollment } from '../../data/lmsCore';
import { buttonClass } from '../Phase1Shared';
import { formatThaiDate } from './LmsShared';

export default function LmsCertificate({ course, enrollment }: { course: Course; enrollment: Enrollment }) {
  const best = Math.max(...enrollment.attempts.slice(enrollment.attemptsResetAt).filter(a => a.passed).map(a => a.score), 0);
  return <div className="space-y-3">
    <div className="flex justify-end print:hidden"><button className={buttonClass} onClick={() => window.print()}><Printer size={16}/> พิมพ์ / บันทึก PDF</button></div>
    <section aria-label="ใบรับรองผลการเรียน" className="mx-auto max-w-3xl border-4 border-double border-blue-800 bg-white p-8 text-center print:border-slate-900">
      <p className="text-xs font-semibold tracking-[0.3em] text-blue-700">CERTIFICATE OF COMPLETION</p>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">ใบรับรองผลการเรียนออนไลน์</h2>
      <p className="mt-6 text-sm text-slate-500">ขอรับรองว่า</p>
      <p className="mt-1 text-2xl font-bold text-blue-800">{enrollment.employeeName}</p>
      <p className="text-sm text-slate-500">{enrollment.department} · รหัสพนักงาน {enrollment.employeeId}</p>
      <p className="mt-5 text-sm text-slate-500">ผ่านการอบรมหลักสูตร</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{course.title}</p>
      <p className="text-xs text-slate-500">รหัส {course.code} · เวอร์ชัน {enrollment.courseVersion}</p>
      <p className="mt-5 text-sm text-slate-700">คะแนนสอบ {best}% (เกณฑ์ผ่าน {course.passScore}%)</p>
      <dl className="mx-auto mt-6 grid max-w-xl gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-slate-500">เลขที่ใบรับรอง</dt><dd className="font-mono font-semibold text-slate-800">{enrollment.certificateNo}</dd></div>
        <div><dt className="text-xs text-slate-500">วันที่รับรอง</dt><dd className="font-semibold text-slate-800">{formatThaiDate(enrollment.certifiedAt)}</dd></div>
        <div><dt className="text-xs text-slate-500">หมดอายุ</dt><dd className="font-semibold text-slate-800">{enrollment.expiryDate ? formatThaiDate(enrollment.expiryDate) : 'ไม่หมดอายุ'}</dd></div>
      </dl>
      <div className="mt-8 text-sm"><div className="mx-auto w-56 border-t border-slate-400 pt-1"><p className="font-semibold text-slate-800">{enrollment.chiefName}</p><p className="text-xs text-slate-500">หัวหน้างานผู้รับรองผล</p></div></div>
    </section>
  </div>;
}
