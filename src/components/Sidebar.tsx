import { allowed } from '../data/permissionStore';
import type { AccessRole } from '../data/permissionStore';
import webparkLogo from '../assets/webpark-logo-horizontal.png';
import { LayoutDashboard, Database, BarChart2, Users, Grid, Settings, CheckSquare, ShieldCheck, BookOpen, CalendarDays, ClipboardEdit, GraduationCap, ClipboardCheck, GitCompare } from 'lucide-react';
import { ROLE_PAGES } from '../data/roleNavigation';
import type { Role } from '../data/phase1Core';
import { useSkillState } from '../data/phase1Store';
import { useTrainingRequests } from '../data/trainingStore';
import { chiefTeam, useLms } from '../data/lmsStore';
import { practicalQueue } from '../data/lmsPractical';

const icons = {
  home: LayoutDashboard,
  master: Database,
  report: BarChart2,
  people: Users,
  skills: Grid,
  settings: Settings,
  approve: CheckSquare,
  permissions: ShieldCheck,
  documents: BookOpen,
  yearly: CalendarDays,
  request: ClipboardEdit,
  training: GraduationCap,
  assessment: ClipboardCheck,
  compare: GitCompare,
};
export default function Sidebar({currentPage,setCurrentPage,userRole,access}:{currentPage:string;setCurrentPage:(page:string)=>void;userRole:Role;access:AccessRole}) {
  const state=useSkillState();const training=useTrainingRequests();const lms=useLms();
  const pages=ROLE_PAGES[userRole].filter(p=>allowed(access,p.id));const groups=[...new Set(pages.map(p=>p.group))];
  function count(id:string){if(id==='chief-training-requests')return training.filter(r=>r.status==='requested'&&chiefTeam(state).some(t=>t.id===r.employeeId)).length;if(id==='chief-training-evaluation')return training.filter(r=>r.status==='scheduled'&&chiefTeam(state).some(t=>t.id===r.employeeId)).length;if(id==='manager-training-approvals')return training.filter(r=>r.status==='pending-manager').length;if(id==='manager-skill-approvals')return state.adjustments.filter(a=>a.status==='pending').length;if(id==='chief-lms-certify')return lms.enrollments.filter(e=>e.status==='pending-chief'&&chiefTeam(state).some(t=>t.id===e.employeeId)).length;if(id==='chief-lms-practical')return practicalQueue(lms,state,new Set(chiefTeam(state).map(t=>t.id))).filter(x=>x.stage==='evaluate'||x.stage==='propose').length;if(id==='staff-lms-learning')return lms.enrollments.filter(e=>e.employeeId==='EMP001'&&['in-progress','returned','locked'].includes(e.status)).length;return 0;}
  return <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-y-auto border-r border-blue-200 bg-sidebar-surface text-slate-600 print:hidden"><div className="flex flex-col items-start gap-2 border-b border-blue-200 bg-sidebar-surface p-4"><img src={webparkLogo} alt="Webpark" width={5541} height={1459} className="h-auto w-56 max-w-full"/><span className="text-xs font-semibold leading-5 text-slate-700">Skill Matrix<br/>ระบบพัฒนาทักษะบุคลากร</span></div><nav className="flex-1 px-3 pb-4" aria-label="เมนูหลัก">{groups.map(group=><div key={group}><div className="mt-5 px-3 pb-2 text-xs font-semibold text-blue-800/70">{group}</div>{pages.filter(p=>p.group===group).map(page=>{const Icon=icons[page.icon];const badge=count(page.id);return <button key={page.id} aria-label={page.title} aria-current={currentPage===page.id?'page':undefined} onClick={()=>setCurrentPage(page.id)} className={`my-0.5 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${currentPage===page.id?'border-blue-300 bg-white font-semibold text-blue-800 shadow-sm':'border-transparent text-slate-700 hover:bg-blue-50 hover:text-blue-800'}`}><Icon size={17} className="shrink-0"/><span className="flex-1">{page.title}</span>{badge>0&&<span className="rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-800">{badge}</span>}</button>;})}</div>)}</nav><div className="border-t border-blue-200 bg-blue-100/50 p-4 text-xs text-blue-800/70">Skill Matrix · หน้าสำหรับแต่ละบทบาท</div></aside>;
}
