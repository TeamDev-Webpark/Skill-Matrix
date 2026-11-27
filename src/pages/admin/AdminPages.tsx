import { Can } from '../../components/Permission';
import { Paged } from '../../components/Paged';
import { FilterBar } from '../../components/FilterBar';
import { useState } from 'react';
import { useTrainingRequests } from '../../data/trainingStore';
import { TRAINING_STATUS } from '../../data/trainingCore';
import { EmptyState, Field, inputClass } from '../../components/Phase1Shared';
import { RolePageIntro } from '../../components/RolePageIntro';
import TrainingRecordCard from '../../components/TrainingRecordCard';
import PhaseOneEmployees from '../PhaseOneEmployees';
import PhaseOneSettings from '../PhaseOneSettings';
import SkillApprovals from '../SkillApprovals';
import JobSummary from '../JobSummary';
import { MasterData } from '../MasterData';
export { default as AdminHomePage } from './AdminHome';
export function AdminEmployeesPage(){return <PhaseOneEmployees userRole="admin"/>;}
export function AdminMasterDataPage(){return <MasterData userRole="admin"/>;}
export function AdminSkillAuditPage(){return <SkillApprovals userRole="admin" title="ตรวจประวัติการปรับคะแนน"/>;}
export function AdminReportsPage(){return <JobSummary userRole="admin" title="รายงานข้อมูลสกิล"/>;}
export function AdminSettingsPage({onNavigate}:{onNavigate:(page:string)=>void}){return <PhaseOneSettings onPermissions={()=>onNavigate('admin-permissions')}/>;}
export function AdminTrainingAuditPage(){const requests=useTrainingRequests();const [status,setStatus]=useState('ALL');const filtered=requests.filter(r=>status==='ALL'||r.status===status).slice().reverse();return <div className="space-y-6"><Can id="header"><RolePageIntro title="ตรวจประวัติฝึกอบรม" description="ตรวจรายการทุกขั้นตอนแบบอ่านอย่างเดียว การพิจารณาดำเนินการโดยหัวหน้าและผู้จัดการ"/></Can><Can id="filters"><FilterBar title="ตัวกรองประวัติฝึกอบรม" onReset={()=>setStatus('ALL')}><Field label="สถานะฝึกอบรม"><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">ทุกสถานะ</option>{Object.entries(TRAINING_STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field></FilterBar></Can>{filtered.length?<Can id="list"><Paged items={filtered} size={5} boxed resetKey={status}>{({rows,bar})=><>{rows.map(r=><TrainingRecordCard key={r.id} record={r}/>)}{bar}</>}</Paged></Can>:<Can id="list"><EmptyState>ไม่มีรายการในสถานะที่เลือก</EmptyState></Can>}</div>;}
