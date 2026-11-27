// เทสต์ส่งต่อรายการระหว่างบทบาทผ่าน store จริง (ชุดเดียวกับที่หน้าจอเรียก) โดยจำลอง localStorage
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./test-source-loader.cjs');
global.window={addEventListener(){}};
const memory=new Map();
global.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const src=name=>load(path.resolve(`src/data/${name}.ts`));
const training=src('trainingStore'),skill=src('phase1Store'),core=src('phase1Core'),lmsCore=src('lmsCore'),{bangkokDate}=src('trainingCore'),{practicalItem}=src('lmsPractical');
const {lmsActions}=src('lmsStore');

let spare;
const records=()=>JSON.parse(memory.get('daihen.training.role-pages.v2')).records;
const lms=()=>JSON.parse(memory.get('skillmatrix.lms.v1'));
const score=(id,key)=>core.employeesForYear(skill.getSkillState(),core.bangkokYear()).find(e=>e.id===id).scores[key]??0;
const enrollment=id=>lms().enrollments.find(e=>e.id===id);
const stage=id=>practicalItem(lms(),skill.getSkillState(),enrollment(id))?.stage;
const pendingAdjust=(employee,key)=>skill.getSkillState().adjustments.filter(a=>a.status==='pending'&&a.employeeId===employee&&a.changes.some(c=>c.key===key));

function learnAndExam(id,right){
  const course=lms().courses.find(c=>c.id===enrollment(id).courseId);
  for(const l of course.lessons)lmsActions.completeLesson(id,l.id,{});
  const exam=lmsCore.buildExam(course,enrollment(id));
  return lmsActions.submitExam(id,Object.fromEntries(exam.map(q=>[q.id,q.type==='multiple'?(right?q.correct:[q.choices.findIndex((_,i)=>!q.correct.includes(i))]):q.type==='short'?(right?q.accepted[0]:'x'):right?q.correct[0]:(q.correct[0]+1)%q.choices.length])));
}

test('training: staff request -> chief schedules -> chief scores -> manager certifies; skills stay unchanged',()=>{
  const busy=new Set(records().filter(r=>r.employeeId==='EMP001'&&['requested','scheduled','pending-manager'].includes(r.status)).map(r=>`${r.wiCode}_${r.skillType}`));
  const [free,free2]=['QCW001-001_A','QCW001-001_B','QCW001-001_C','QCW001-001_D','QCW001-002_A','QCW001-002_B','QCW001-002_C','QCW004-001_A','QCW004-001_C','QCW004-001_D'].filter(k=>!busy.has(k));
  spare=free2;
  const [wiCode,skillType]=free.split('_');
  const form={wiCode,skillType,desiredDate:bangkokDate(),reason:'ทดสอบส่งต่อ'};
  const before=score('EMP001',free);
  training.submitTraining(form);
  const id=records().at(-1).id;const row=()=>records().find(r=>r.id===id);
  assert.equal(row().status,'requested');
  assert.throws(()=>training.submitTraining(form),/อยู่ระหว่างดำเนินการ/);
  assert.throws(()=>training.approveTrainingResult(id,true,''),/ไม่พบ/);
  training.decideTrainingRequest(id,true,bangkokDate(),'นัดแล้ว');assert.equal(row().status,'scheduled');assert.equal(row().scheduledDate,bangkokDate());
  training.scoreTraining(id,90,85,'ผ่าน');assert.equal(row().status,'pending-manager');
  assert.throws(()=>training.approveTrainingResult(id,false,''),/เหตุผล/);
  training.approveTrainingResult(id,true,'ดี');assert.equal(row().status,'approved');assert.equal(row().managerRemark,'ดี');
  assert.equal(score('EMP001',free),before);
});
test('training: chief rejection and failed evaluation end the request and allow a new one',()=>{
  const [wiCode,skillType]=spare.split('_');
  const form={wiCode,skillType,desiredDate:bangkokDate(),reason:'ทดสอบ'};
  training.submitTraining(form);let id=records().at(-1).id;
  assert.throws(()=>training.decideTrainingRequest(id,false,'',''),/เหตุผล/);
  training.decideTrainingRequest(id,false,'','ยังไม่จำเป็น');assert.equal(records().at(-1).status,'rejected-chief');
  training.submitTraining(form);id=records().at(-1).id;training.decideTrainingRequest(id,true,bangkokDate(),'');
  training.scoreTraining(id,70,95,'ทฤษฎีไม่ผ่าน');assert.equal(records().at(-1).status,'failed');
  training.submitTraining(form);assert.equal(records().at(-1).status,'requested');
});
test('manual score change: chief proposes -> manager adjusts or rejects -> score follows the manager only',()=>{
  const key='QCW001-001_B';const before=score('EMP001',key);const proposed=before===3?1:3;
  skill.submitSkillAdjustment('chief','EMP001',{[key]:proposed},'ทบทวน','');
  const [request]=pendingAdjust('EMP001',key);assert.equal(score('EMP001',key),before);
  assert.throws(()=>skill.submitSkillAdjustment('chief','EMP001',{[key]:proposed},'ซ้ำ',''),/รออนุมัติ/);
  assert.throws(()=>skill.submitSkillAdjustment('chief','EMP012',{'QCW001-001_A':0},'นอกทีม',''),/ใต้บังคับบัญชา/);
  assert.throws(()=>skill.decideSkillAdjustment('chief',request.id,'approved',''),/ผู้จัดการ/);
  const final=[0,1,2,3].find(n=>n!==before&&n!==proposed);
  skill.decideSkillAdjustment('manager',request.id,'approved','ปรับตามจริง',{[key]:final});
  assert.equal(score('EMP001',key),final);
  const done=skill.getSkillState().adjustments.find(a=>a.id===request.id);assert.equal(done.changes[0].proposedAfter,proposed);
  skill.submitSkillAdjustment('chief','EMP001',{[key]:before},'คืนค่า','');
  const [second]=pendingAdjust('EMP001',key);
  assert.throws(()=>skill.decideSkillAdjustment('manager',second.id,'rejected',''),/เหตุผล/);
  skill.decideSkillAdjustment('manager',second.id,'rejected','หลักฐานไม่พอ');assert.equal(score('EMP001',key),final);
});

const KEY='QCW002-001_C';
test('lms: assign -> lock -> unlock -> return -> certify -> practical -> manager confirms skill level',()=>{
  assert.deepEqual(lmsActions.assign('CRS-QC-NC','chief',[{id:'EMP012',name:'นอกทีม',department:'QC Section'}]).length,1);
  // ใช้ EMP011 (ระดับ 1) กับหลักสูตรเป้าหมาย Lv 2 ที่ต้องผ่าน QC-MEASURE ก่อน (ข้อมูลตั้งต้นผ่านแล้ว)
  const course='CRS-QC-NC';
  assert.deepEqual(lmsActions.assign(course,'chief',[{id:'EMP011',name:'กฤษณะ',department:'QC Section'}]),[]);
  const id=lms().enrollments.find(x=>x.employeeId==='EMP011'&&x.courseId===course).id;
  for(let i=0;i<3;i++)learnAndExam(id,false);
  assert.equal(enrollment(id).status,'locked');
  lmsActions.unlock('chief',id,'ทบทวนแล้ว');assert.equal(enrollment(id).status,'returned');assert.deepEqual(enrollment(id).lessonDone,{});
  learnAndExam(id,true);assert.equal(enrollment(id).status,'pending-chief');
  lmsActions.certify(id,false,'ยังไม่เข้าใจขั้นตอน');assert.equal(enrollment(id).status,'returned');
  learnAndExam(id,true);lmsActions.certify(id,true,'ผ่าน');assert.equal(enrollment(id).status,'certified');
  const numbers=lms().enrollments.map(x=>x.certificateNo).filter(Boolean);assert.equal(new Set(numbers).size,numbers.length,'เลขใบรับรองต้องไม่ซ้ำ');
  assert.equal(score('EMP011',KEY),1);assert.equal(stage(id),'evaluate');
  assert.throws(()=>lmsActions.proposeSkill(id),/ประเมินหน้างาน/);
  lmsActions.recordPractical(id,{score:60,note:'ยังพลาด',observedOn:bangkokDate()});assert.equal(stage(id),'failed');
  lmsActions.recordPractical(id,{score:90,note:'ทำได้',observedOn:bangkokDate()});assert.equal(stage(id),'propose');
  lmsActions.proposeSkill(id);assert.equal(stage(id),'waiting-manager');assert.equal(pendingAdjust('EMP011',KEY).length,1);
  assert.throws(()=>lmsActions.proposeSkill(id),/รออนุมัติ/);
  assert.throws(()=>lmsActions.recordPractical(id,{score:50,note:'x',observedOn:bangkokDate()}),/รอ Manager/,'ห้ามประเมินทับระหว่างรอ Manager');
  skill.decideSkillAdjustment('manager',pendingAdjust('EMP011',KEY)[0].id,'rejected','ขอดูอีกรอบ');assert.equal(stage(id),'rejected');assert.equal(score('EMP011',KEY),1);
  lmsActions.recordPractical(id,{score:95,note:'ประเมินรอบสอง',observedOn:bangkokDate()});lmsActions.proposeSkill(id);
  // Manager อนุมัติแต่คงระดับต่ำกว่าเป้า: ต้องไม่ขึ้นว่าถึงเป้าหมายแล้ว
  skill.decideSkillAdjustment('manager',pendingAdjust('EMP011',KEY)[0].id,'approved','คงไว้ก่อน',{[KEY]:1});
  assert.equal(score('EMP011',KEY),1);assert.equal(stage(id),'rejected');
  lmsActions.recordPractical(id,{score:96,note:'รอบสาม',observedOn:bangkokDate()});lmsActions.proposeSkill(id);
  skill.decideSkillAdjustment('manager',pendingAdjust('EMP011',KEY)[0].id,'approved','ยืนยัน');
  assert.equal(score('EMP011',KEY),2);assert.equal(stage(id),'done');
  assert.throws(()=>lmsActions.proposeSkill(id),/ถึงระดับเป้าหมาย/,'ห้ามเสนอซ้ำจนคะแนนถูกลด');
});
test('lms: a level already above the course target can never be proposed downwards',()=>{
  const state=lms();const demo=state.enrollments.find(x=>x.id==='ENR-DEMO-PROPOSE');assert.ok(demo);
  const key='QCW004-001_D';
  skill.submitSkillAdjustment('chief','EMP001',{[key]:3},'ปรับด้วยมือ','');
  skill.decideSkillAdjustment('manager',pendingAdjust('EMP001',key)[0].id,'approved','');
  assert.throws(()=>lmsActions.proposeSkill(demo.id),/ถึงระดับเป้าหมาย/);
  assert.equal(score('EMP001',key),3);
});
test('lms: demo reset restores courses, enrollments and the manager queue examples together',()=>{
  skill.resetSkillDemoState();lmsActions.resetDemo();
  assert.equal(lms().courses.length,18);
  assert.equal(stage('ENR-DEMO-WAIT'),'waiting-manager');assert.equal(stage('ENR-DEMO-REJECT'),'rejected');
});

test('training: chief scope is direct reports only, same as the dashboard and badges',()=>{
  const {chiefRequests,reviewTrainingRequest,evaluateTraining}=src('trainingCore');
  const base={id:'TR-OUT',employeeId:'EMP012',employeeName:'นอกทีม',department:'QC Section',wiCode:'QCW001-001',skillType:'A',desiredDate:bangkokDate(),reason:'x',submittedAt:new Date().toISOString(),status:'requested'};
  const team=core.visibleEmployees(core.employeesForYear(skill.getSkillState(),core.bangkokYear()),'chief').map(e=>e.id);
  assert.deepEqual(chiefRequests([base,{...base,id:'TR-IN',employeeId:'EMP001'}],team).map(r=>r.id),['TR-IN']);
  assert.throws(()=>reviewTrainingRequest([base],'chief','TR-OUT',true,bangkokDate(),'',new Date(),team),/ลูกทีมตรง/);
  assert.throws(()=>evaluateTraining([{...base,status:'scheduled',scheduledDate:bangkokDate()}],'chief','TR-OUT',90,90,'x',new Date(),team),/ลูกทีมตรง/);
});
