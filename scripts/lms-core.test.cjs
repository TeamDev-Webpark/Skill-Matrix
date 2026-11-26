const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./test-source-loader.cjs');
global.window={addEventListener(){}};
const storage=new Map();
global.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const core=load(path.resolve('src/data/lmsCore.ts'));
const {lmsSeed}=load(path.resolve('src/data/lmsSeed.ts'));
const {addDemoHistory}=load(path.resolve('src/data/lmsDemoHistory.ts'));
const {addDemoCourses}=load(path.resolve('src/data/lmsDemoCourses.ts'));
const {lmsAnalytics}=load(path.resolve('src/data/lmsAnalytics.ts'));
const now=new Date('2026-10-14T04:00:00Z');
const staff={id:'EMP001',name:'นายสมชาย ใจดี',department:'QC Section'};
const chief={name:'หัวหน้า',reportIds:['EMP001']};
const fresh=()=>({courses:lmsSeed(now).courses,enrollments:[]});
function learnAll(s,id){const e=s.enrollments.find(x=>x.id===id);const c=s.courses.find(x=>x.id===e.courseId);for(const l of c.lessons)s=core.completeLesson(s,id,l.id,{},now);return s;}
function answerAll(s,id,right){const e=s.enrollments.find(x=>x.id===id);const c=s.courses.find(x=>x.id===e.courseId);const exam=core.buildExam(c,e);return Object.fromEntries(exam.map(q=>[q.id,right?q.correct[0]:[...q.choices.keys()].find(k=>!q.correct.includes(k))]));}

test('staff self-enrolls without a request and cannot duplicate or join other departments',()=>{
  let s=core.enroll(fresh(),staff,'CRS-SAFETY',{role:'staff',name:staff.name},{},now);
  assert.equal(s.enrollments[0].source,'self');assert.equal(s.enrollments[0].status,'in-progress');
  assert.throws(()=>core.enroll(s,staff,'CRS-SAFETY',{role:'staff',name:staff.name},{},now),/ลงทะเบียน/);
  assert.throws(()=>core.enroll(fresh(),staff,'CRS-5S',{role:'staff',name:staff.name},{},now),/แผนก/);
  assert.throws(()=>core.enroll(fresh(),staff,'CRS-DOC',{role:'staff',name:staff.name},{},now),/ยังไม่เปิด/);
});
test('lessons must be completed in order, exam needs all lessons, pass sends to chief',()=>{
  let s=core.enroll(fresh(),staff,'CRS-SAFETY',{role:'staff',name:staff.name},{},now);const id=s.enrollments[0].id;
  assert.throws(()=>core.completeLesson(s,id,'L-SAF-2',{},now),/บทก่อนหน้า/);
  assert.throws(()=>core.submitExam(s,id,{},now),/เรียนครบ/);
  s=learnAll(s,id);
  assert.throws(()=>core.submitExam(s,id,{},now),/ตอบให้ครบ/);
  const r=core.submitExam(s,id,answerAll(s,id,true),now);
  assert.equal(r.attempt.score,100);assert.equal(r.state.enrollments[0].status,'pending-chief');
});
test('failing three times locks the attempt; chief or admin unlock requires reason and restarts lessons',()=>{
  let s=core.enroll(fresh(),staff,'CRS-SAFETY',{role:'staff',name:staff.name},{},now);const id=s.enrollments[0].id;s=learnAll(s,id);
  for(let i=0;i<3;i++)s=core.submitExam(s,id,answerAll(s,id,false),now).state;
  assert.equal(s.enrollments[0].status,'locked');
  assert.throws(()=>core.submitExam(s,id,answerAll(s,id,true),now),/สอบ/);
  assert.throws(()=>core.unlockAttempts(s,'staff',chief,id,'x',now),/เฉพาะ/);
  assert.throws(()=>core.unlockAttempts(s,'chief',chief,id,' ',now),/เหตุผล/);
  s=core.unlockAttempts(s,'chief',chief,id,'อบรมซ้ำแล้ว',now);
  assert.equal(s.enrollments[0].status,'returned');assert.equal(core.attemptsUsed(s.enrollments[0]),0);assert.deepEqual(s.enrollments[0].lessonDone,{});
});
test('only the direct chief certifies; return needs reason; certify issues numbered certificate with expiry',()=>{
  let s=core.enroll(fresh(),staff,'CRS-SAFETY',{role:'staff',name:staff.name},{},now);const id=s.enrollments[0].id;s=learnAll(s,id);s=core.submitExam(s,id,answerAll(s,id,true),now).state;
  assert.throws(()=>core.certifyResult(s,'manager',chief,id,true,'',now),/หัวหน้า/);
  assert.throws(()=>core.certifyResult(s,'chief',{name:'x',reportIds:['EMP999']},id,true,'',now),/ลูกทีมตรง/);
  assert.throws(()=>core.certifyResult(s,'chief',chief,id,false,'',now),/เหตุผล/);
  const ok=core.certifyResult(s,'chief',chief,id,true,'ผ่าน',now).enrollments[0];
  assert.equal(ok.status,'certified');assert.equal(ok.certificateNo,'CERT-2026-0001');assert.equal(ok.expiryDate,'2027-10-14');
  const back=core.certifyResult(s,'chief',chief,id,false,'ทบทวนอีกครั้ง',now).enrollments[0];
  assert.equal(back.status,'returned');assert.deepEqual(back.lessonDone,{});
  assert.throws(()=>core.certifyResult(core.certifyResult(s,'chief',chief,id,true,'',now),'chief',chief,id,true,'',now),/ไม่พบ/);
  const expired=core.isExpired(ok,'2027-10-15');assert.equal(expired,true);
});
test('admin course management validates, versions published edits, protects history',()=>{
  let s=fresh();
  assert.throws(()=>core.saveCourse(s,'staff','x',core.emptyCourse(now),false,now),/เฉพาะผู้ดูแลระบบ/);
  const c=core.emptyCourse(now);c.code='LMS-099';c.title='ทดสอบ';
  assert.throws(()=>core.saveCourse(s,'admin','a',c,true,now),/บทเรียน/);
  const l=core.emptyLesson('article');l.title='บท 1';l.body='เนื้อหา';const q=core.emptyQuestion();q.text='ถาม';q.choices=['ก','ข','',''];q.correct=[0];
  const full={...c,lessons:[l],questions:[q]};
  s=core.saveCourse(s,'admin','a',full,true,now);const saved=s.courses.find(x=>x.id===c.id);assert.equal(saved.status,'published');assert.equal(saved.version,1);
  s=core.saveCourse(s,'admin','a',{...saved,lessons:[{...l,body:'แก้ไข'}]},false,now);assert.equal(s.courses.find(x=>x.id===c.id).version,2);
  assert.throws(()=>core.saveCourse(s,'admin','a',{...saved,code:'LMS-001'},false,now),/ซ้ำ/);
  const dup=core.duplicateCourse(s,'admin','a',c.id,now);assert.equal(dup.courses.length,s.courses.length+1);assert.equal(dup.courses.at(-1).status,'draft');
  s=core.enroll(s,staff,c.id,{role:'staff',name:'s'},{},now);
  assert.throws(()=>core.deleteCourse(s,'admin',c.id),/ประวัติ/);
  assert.throws(()=>core.removeEnrollment(core.certifyResult({...s,enrollments:[{...s.enrollments[0],status:'certified'}]},'chief',chief,'x',true,''),'admin','x'),/ไม่พบ/);
});
test('prerequisites, sequential flag and stats',()=>{
  const base=lmsSeed(now);
  const doc=base.courses.find(c=>c.id==='CRS-DOC');
  assert.equal(core.prerequisitesMet(base,doc,'EMP001'),false);
  const certified=base.enrollments.find(e=>e.status==='certified');
  assert.equal(core.prerequisitesMet(base,doc,certified.employeeId),true);
  const st=core.courseStats(base,'CRS-SAFETY','2026-10-14');
  assert.ok(st.enrolled>=3&&st.certified>=1&&st.locked>=1);
});
test('skill target: fit by current level, publish requires valid skill goal',()=>{
  const c={skillFromLevel:1,skillToLevel:2};
  assert.equal(core.skillFit(c,0),'too-early');assert.equal(core.skillFit(c,1),'recommended');assert.equal(core.skillFit(c,2),'reached');assert.equal(core.skillFit({skillFromLevel:0,skillToLevel:0},0),'none');
  const qc=lmsSeed(now).courses.find(x=>x.id==='CRS-QC-MEASURE');
  assert.equal(core.skillKey(qc),'QCW002-001_C');
  assert.ok(core.validateCourse({...qc,skillToLevel:1,skillFromLevel:1},[qc],true).some(e=>e.includes('สกิลเป้าหมาย')));
  assert.deepEqual(core.validateCourse(qc,[qc],true),[]);
});

test('question types: single, multiple (all-or-nothing / partial), true-false, short answer, per-question points',()=>{
  const mk=(o)=>({...core.emptyQuestion(o.type||'single'),text:'q',points:2,...o});
  const single=mk({choices:['a','b','c'],correct:[1]});
  assert.equal(core.gradeQuestion(single,1),2);assert.equal(core.gradeQuestion(single,0),0);assert.equal(core.gradeQuestion(single,undefined),0);
  const multi=mk({type:'multiple',choices:['a','b','c','d'],correct:[0,2]});
  assert.equal(core.gradeQuestion(multi,[0,2]),2);assert.equal(core.gradeQuestion(multi,[0]),0);assert.equal(core.gradeQuestion(multi,[0,1,2]),0);
  const part={...multi,partial:true};
  assert.equal(core.gradeQuestion(part,[0]),1);assert.equal(core.gradeQuestion(part,[0,1]),0);assert.equal(core.gradeQuestion(part,[0,2]),2);
  const tf=mk({type:'truefalse',choices:['ถูก','ผิด'],correct:[1]});assert.equal(core.gradeQuestion(tf,1),2);assert.equal(core.gradeQuestion(tf,0),0);
  const short=mk({type:'short',choices:[],correct:[],accepted:['  Calibration ','สอบเทียบ']});
  assert.equal(core.gradeQuestion(short,'calibration'),2);assert.equal(core.gradeQuestion(short,'สอบเทียบ '),2);assert.equal(core.gradeQuestion(short,'x'),0);
  const g=core.gradeExam([single,multi,tf,short],{[single.id]:1,[multi.id]:[0],[tf.id]:1,[short.id]:'x'});
  assert.equal(g.totalPoints,8);assert.equal(g.points,4);assert.equal(g.score,50);assert.equal(g.correct,2);
});
test('shuffled exam keeps the right answers mapped; legacy answerIndex questions are normalized; image-only choices count',()=>{
  const q=core.normalizeQuestion({id:'Q1',text:'x',choices:['a','b','c','d'],answerIndex:2,explanation:''});
  assert.deepEqual(q.correct,[2]);assert.equal(q.points,1);
  const c={...core.emptyCourse(now),questions:[{...q,shuffle:true,choices:['a','b','c','d'],choiceImages:['','','idb:x','']}],questionsPerExam:0};
  for(const id of ['A','B','C','D','E']){const e={id,attempts:[]};const [qq]=core.buildExam(c,e);assert.equal(qq.choices[qq.correct[0]],'c');assert.equal(qq.choiceImages[qq.correct[0]],'idb:x');}
  const imgOnly={...core.emptyQuestion(),text:'',image:'https://x/y.png',choices:['','',' ',''],choiceImages:['https://x/1.png','https://x/2.png','',''],correct:[1]};
  assert.deepEqual(core.validateCourse({...core.emptyCourse(now),code:'Z',title:'Z',questions:[imgOnly]},[],false),[]);
  assert.ok(core.validateCourse({...core.emptyCourse(now),code:'Z',title:'Z',questions:[{...imgOnly,correct:[3]}]},[],false).some(e=>e.includes('คำตอบที่ถูก')));
  assert.ok(core.validateCourse({...core.emptyCourse(now),code:'Z',title:'Z',questions:[{...imgOnly,type:'short',accepted:[' ']}]},[],false).some(e=>e.includes('คำตอบที่ยอมรับ')));
});
test('media refs collect from lessons and question/choice images; video source parser knows uploaded files',()=>{
  const media=load(path.resolve('src/data/lmsMedia.ts'));
  const c={...core.emptyCourse(now),lessons:[{...core.emptyLesson('video'),videoUrl:'idb:v1'}],questions:[{...core.emptyQuestion(),image:'idb:i1',choiceImages:['','idb:i2','https://x']}]};
  assert.deepEqual([...media.collectMediaRefs([c])].sort(),['idb:i1','idb:i2','idb:v1']);
  const vs=load(path.resolve('src/components/lms/videoSource.ts'));
  assert.equal(vs.parseVideoSource('idb:v1').kind,'file');assert.equal(vs.parseVideoSource('https://youtu.be/dQw4w9WgXcQ').kind,'youtube');assert.equal(vs.parseVideoSource('https://x.com/a.mp4').kind,'direct');
});

test('chief actions are limited to direct reports; demo chief queue only holds direct reports',()=>{
  const by={role:'chief',name:'c',reportIds:['EMP001']};
  assert.equal(core.enroll(fresh(),staff,'CRS-SAFETY',by,{},now).enrollments.length,1);
  assert.throws(()=>core.enroll(fresh(),{...staff,id:'EMP999'},'CRS-SAFETY',by,{},now),/ลูกทีมตรง/);
  let s=core.enroll(fresh(),staff,'CRS-SAFETY',by,{},now);const id=s.enrollments[0].id;
  assert.throws(()=>core.setDueDate(s,'chief','c',id,'2026-12-01',now,['EMP999']),/ลูกทีมตรง/);
  s=learnAll(s,id);for(let i=0;i<3;i++)s=core.submitExam(s,id,answerAll(s,id,false),now).state;
  assert.throws(()=>core.unlockAttempts(s,'chief',{name:'c',reportIds:[]},id,'x',now),/ลูกทีมตรง/);
  const {isChiefReport}=load(path.resolve('src/data/teamScope.ts'));
  const people=load(path.resolve('src/data/phase1Core.ts')).initialState().snapshots[0].employees;
  const waiting=lmsSeed(now).enrollments.filter(e=>['pending-chief','locked'].includes(e.status));
  assert.ok(waiting.length>=3);
  for(const e of waiting)assert.ok(isChiefReport(people.find(p=>p.id===e.employeeId)),e.employeeId);
});
test('exam alone cannot raise a skill: certify -> practical evaluation -> propose -> manager confirms',()=>{
  let s=core.enroll(fresh(),staff,'CRS-QC-MEASURE',{role:'staff',name:'s'},{},now);const id=s.enrollments[0].id;s=learnAll(s,id);s=core.submitExam(s,id,answerAll(s,id,true),now).state;
  const input={score:85,note:'ปฏิบัติครบตาม W/I',observedOn:'2026-10-14'};
  assert.throws(()=>core.recordPractical(s,'chief',chief,id,input,now),/หลังรับรองผลสอบ/);
  s=core.certifyResult(s,'chief',chief,id,true,'',now);
  const course=s.courses.find(c=>c.id==='CRS-QC-MEASURE');const stage=(st,level,adj)=>core.practicalStage(course,st.enrollments[0],level,adj);
  assert.equal(stage(s,1),'evaluate');assert.equal(stage(s,2),'done');
  assert.throws(()=>core.markProposed(s,'chief',chief,id,{adjustmentId:'a',level:2},now),/ประเมินหน้างาน/);
  assert.throws(()=>core.recordPractical(s,'manager',chief,id,input,now),/เฉพาะ/);
  assert.throws(()=>core.recordPractical(s,'chief',{name:'x',reportIds:[]},id,input,now),/ลูกทีมตรง/);
  assert.throws(()=>core.recordPractical(s,'chief',chief,id,{...input,score:101},now),/0–100/);
  assert.throws(()=>core.recordPractical(s,'chief',chief,id,{...input,observedOn:'2026-10-15'},now),/ไม่เกินวันนี้/);
  assert.throws(()=>core.recordPractical(s,'chief',chief,id,{...input,observedOn:'2026-10-13'},now),/ไม่ก่อน/);
  assert.throws(()=>core.recordPractical(s,'chief',chief,id,{...input,note:' '},now),/หลักฐาน/);
  const failed=core.recordPractical(s,'chief',chief,id,{...input,score:79},now);assert.equal(stage(failed,1),'failed');
  s=core.recordPractical(failed,'chief',chief,id,input,now);assert.equal(stage(s,1),'propose');
  s=core.markProposed(s,'chief',chief,id,{adjustmentId:'SK-1',level:2},now);
  assert.equal(stage(s,1,'pending'),'waiting-manager');assert.equal(stage(s,1,'rejected'),'rejected');assert.equal(stage(s,2,'approved'),'done');
  assert.equal(core.recordPractical(s,'chief',chief,id,input,now).enrollments[0].proposal,undefined);
});

test('manager dashboard counts mandatory compliance, follow-ups and skill gaps',()=>{
  const course={...lmsSeed(now).courses.find(c=>c.id==='CRS-SAFETY')};
  const qc={...lmsSeed(now).courses.find(c=>c.id==='CRS-QC-MEASURE')};
  const row=(id,courseId,extra)=>({id:courseId+id,courseId,employeeId:id,employeeName:id,department:'QC Section',enrolledAt:'2026-09-01T03:00:00Z',status:'in-progress',lessonDone:{},attempts:[],attemptsResetAt:0,events:[],...extra});
  const lms={courses:[course,qc],enrollments:[
    row('A','CRS-SAFETY',{status:'certified',certifiedAt:'2026-10-01T03:00:00Z',expiryDate:'2027-10-01'}),
    row('B','CRS-SAFETY',{status:'certified',certifiedAt:'2025-09-01T03:00:00Z',expiryDate:'2026-09-01'}),
    row('C','CRS-SAFETY',{dueDate:'2026-10-01'})]};
  const people=['A','B','C','D'].map(id=>({id,name:id,department:'QC Section',scores:{[core.skillKey(qc)]:id==='A'?3:0}}));
  const wis=[{code:qc.wiCode,name:'w',department:'QC Section',types:[{code:qc.skillType,label:'t'},{code:'Z',label:'z'}]}];
  const d=lmsAnalytics(lms,people,[],wis,{department:'ALL',category:'ALL'},now);
  assert.deepEqual(d.compliance,{required:4,done:1,rate:25});          // ใบที่หมดอายุไม่นับ
  assert.equal(d.followUp.overdue.length,1);assert.equal(d.followUp.expiry.length,1);
  assert.equal(d.gaps.find(g=>g.type===qc.skillType).below,3);assert.equal(d.gapsWithoutCourse,1);
});
test('demo history keeps existing rows, skips demo chief reports and keeps certificate numbers unique',()=>{
  const base=lmsSeed(now);const next=addDemoHistory(base,now);
  assert.deepEqual(next.enrollments.slice(0,base.enrollments.length),base.enrollments);
  assert.ok(next.enrollments.length>100);
  const added=next.enrollments.slice(base.enrollments.length);
  assert.ok(!added.some(e=>['EMP001','EMP004','EMP011'].includes(e.employeeId)));
  assert.equal(new Set(next.enrollments.map(e=>e.id)).size,next.enrollments.length);
  const numbers=next.enrollments.map(e=>e.certificateNo).filter(Boolean);
  assert.equal(new Set(numbers).size,numbers.length);
  assert.equal(addDemoHistory(next,now).enrollments.length,next.enrollments.length);
});

test('additional courses contain complete editor-compatible lessons, exams and valid skill targets', () => {
  const state = lmsSeed(now);
  const added = state.courses.slice(4);
  const { SKILL_WIS } = load(path.resolve('src/data/phase1Core.ts'));
  assert.equal(added.length, 8);
  assert.equal(added.filter(c => c.status === 'published').length, 6);
  assert.equal(added.filter(c => c.status === 'draft').length, 2);
  assert.equal(added.flatMap(c => c.lessons).length, 24);
  assert.equal(added.flatMap(c => c.questions).length, 48);
  for (const c of added) {
    assert.deepEqual(core.validateCourse(c, state.courses, true), [], c.code);
    assert.ok(c.description.length > 80 && c.instructor && c.updatedBy, c.code);
    assert.ok(c.createdAt < c.updatedAt && c.version === 1, c.code);
    assert.ok(c.lessons.every(l => l.objectives.length >= 2 && l.body.length > 200 && l.minSeconds >= 30), c.code);
    assert.ok(c.questions.every(q => q.explanation && q.points > 0), c.code);
    assert.ok(c.prerequisiteIds.every(id => state.courses.some(p => p.id === id)), c.code);
    if (c.wiCode) {
      const wi = SKILL_WIS.find(w => w.code === c.wiCode);
      assert.equal(wi.department, c.department);
      assert.ok(wi.types.some(t => t.code === c.skillType));
    }
  }
  const ids = added.flatMap(c => [c.id, ...c.lessons.map(l => l.id), ...c.questions.map(q => q.id)]);
  assert.equal(new Set(ids).size, ids.length);
});

test('course expansion preserves existing edits and enrollments, skips code conflicts and adds only once', () => {
  const seeded = lmsSeed(now);
  const original = { ...seeded.courses[0], title: 'ชื่อที่ผู้ใช้แก้ไว้', status: 'archived' };
  const conflict = { ...seeded.courses[4], id: 'USER-COURSE', code: ' lms-005 ', title: 'หลักสูตรที่ผู้ใช้สร้างเอง' };
  const legacy = { courses: [original, ...seeded.courses.slice(1, 4), conflict], enrollments: seeded.enrollments };
  const before = structuredClone(legacy);
  const expanded = addDemoCourses(legacy);
  assert.deepEqual(legacy, before);
  assert.deepEqual(expanded.courses.slice(0, legacy.courses.length), legacy.courses);
  assert.strictEqual(expanded.enrollments, legacy.enrollments);
  assert.equal(expanded.courses.length, 12);
  assert.ok(!expanded.courses.some(c => c.id === seeded.courses[4].id));
  assert.strictEqual(addDemoCourses(expanded), expanded);
  const missingPrerequisite = addDemoCourses({ courses: [], enrollments: [] });
  for (const c of missingPrerequisite.courses) {
    assert.ok(c.prerequisiteIds.every(id => missingPrerequisite.courses.some(p => p.id === id)));
  }
});

test('every added course can be published, edited, enrolled, completed and passed through normal actions', () => {
  const seeded = lmsSeed(now);
  for (const course of seeded.courses.slice(4)) {
    let state = { courses: seeded.courses, enrollments: [] };
    state = core.saveCourse(state, 'admin', 'ผู้ดูแล', { ...course, description: `${course.description}\nทบทวนเนื้อหาแล้ว` }, true, now);
    const learner = { id: 'LEARNER', name: 'ผู้เข้าอบรม', department: course.department === 'ALL' ? 'QC Section' : course.department };
    function certifyPrerequisites(courseId) {
      const current = state.courses.find(c => c.id === courseId);
      for (const prerequisiteId of current.prerequisiteIds) {
        certifyPrerequisites(prerequisiteId);
        if (!core.activeEnrollment(state, learner.id, prerequisiteId)) {
          state = core.enroll(state, learner, prerequisiteId, { role: 'admin', name: 'ผู้ดูแล' }, {}, now);
          state.enrollments.at(-1).status = 'certified';
        }
      }
    }
    certifyPrerequisites(course.id);
    state = core.enroll(state, learner, course.id, { role: 'staff', name: learner.name }, {}, now);
    const id = state.enrollments.at(-1).id;
    state = learnAll(state, id);
    const answers = Object.fromEntries(core.buildExam(course, state.enrollments.at(-1)).map(q => [q.id,
      q.type === 'short' ? q.accepted[0] : q.type === 'multiple' ? q.correct : q.correct[0]]));
    const result = core.submitExam(state, id, answers, now);
    assert.equal(result.attempt.score, 100, course.code);
    assert.equal(result.state.enrollments.at(-1).status, 'pending-chief', course.code);
  }
});
