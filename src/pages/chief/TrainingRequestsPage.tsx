import { Can } from '../../components/Permission';
import { Paged } from '../../components/Paged';
import { useState } from 'react';
import { chiefTeam } from '../../data/lmsStore';
import { useSkillState } from '../../data/phase1Store';
import { chiefRequests } from '../../data/trainingCore';
import { bangkokDate } from '../../data/trainingCore';
import { decideTrainingRequest, useTrainingRequests } from '../../data/trainingStore';
import { buttonClass, EmptyState, Field, inputClass, Metric } from '../../components/Phase1Shared';
import TrainingRecordCard from '../../components/TrainingRecordCard';
import { RolePageIntro } from '../../components/RolePageIntro';
export default function TrainingRequestsPage() {
  const team=chiefTeam(useSkillState()).map(e=>e.id);
  const requests=chiefRequests(useTrainingRequests(),team).filter(r=>r.status==='requested');
  const [dates,setDates]=useState<Record<string,string>>({});
  const [remarks,setRemarks]=useState<Record<string,string>>({});
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  function decide(id:string,approve:boolean) {
    setError('');setMessage('');
    try{decideTrainingRequest(id,approve,dates[id]??bangkokDate(),remarks[id]??'');setMessage(approve?'อนุมัติคำขอและแจ้งวันนัดหมายให้พนักงานแล้ว':'แจ้งผลไม่อนุมัติพร้อมเหตุผลให้พนักงานแล้ว');}
    catch(e){setError((e as Error).message);}
  }
  return <div className="space-y-6"><Can id="header"><RolePageIntro title="ตรวจคำขอฝึกอบรม" description="พิจารณาคำขอจากลูกทีมตรงของคุณ" steps={['ตรวจงานและเหตุผลที่ขออบรม','กำหนดวันนัดหมาย','อนุมัติหรือแจ้งเหตุผลที่ปฏิเสธ']}/></Can><Can id="metrics"><Metric label="คำขอรอหัวหน้าพิจารณา" value={requests.length}/></Can>{error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{message}</p>}{requests.length?<Can id="list"><Paged items={requests} size={5} boxed>{({rows,bar})=><>{rows.map(r=><TrainingRecordCard key={r.id} record={r}><div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2"><Field label={`วันนัดอบรม ${r.employeeId} ${r.wiCode}`}><input type="date" min={bangkokDate()} className={inputClass} value={dates[r.id]??bangkokDate()} onChange={e=>setDates({...dates,[r.id]:e.target.value})}/></Field><Field label={`ความเห็นหัวหน้า ${r.employeeId} ${r.wiCode}`}><input maxLength={2000} className={inputClass} value={remarks[r.id]??''} onChange={e=>setRemarks({...remarks,[r.id]:e.target.value})} placeholder="จำเป็นเมื่อไม่อนุมัติ"/></Field></div><Can id="list" action="edit"><div className="flex justify-end gap-2"><button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={()=>decide(r.id,false)}>ไม่อนุมัติคำขอ</button><button className={buttonClass} onClick={()=>decide(r.id,true)}>อนุมัติคำขอและนัดหมาย</button></div></Can></TrainingRecordCard>)}{bar}</>}</Paged></Can>:<Can id="list"><EmptyState>ไม่มีคำขอฝึกอบรมที่รอหัวหน้าพิจารณา</EmptyState></Can>}</div>;
}
