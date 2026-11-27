// สิทธิ์และบทบาท: ตรรกะการอนุญาต และตรวจว่าทุกรายการในทะเบียนมีตัวควบคุมจริงในหน้าจอ
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./test-source-loader.cjs');
const memory=new Map();
global.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const registry=load(path.resolve('src/data/permissionRegistry.ts'));
const perms=load(path.resolve('src/data/permissionStore.ts'));
const {ROLE_PAGES}=load(path.resolve('src/data/roleNavigation.ts'));

const map={'staff-home':['pages/staff/StaffHome'],'staff-my-skills':['pages/staff/MyScoresPage'],'staff-yearly':['pages/YearlySkill'],'staff-training-request':['pages/staff/TrainingRequestPage'],'staff-training-tracking':['pages/staff/TrainingTrackingPage'],'staff-training-results':['pages/staff/TrainingResultsPage'],'staff-lms-learning':['pages/staff/LmsStaffPages'],'staff-lms-catalog':['pages/staff/LmsStaffPages','components/lms/CatalogCard'],'staff-lms-certificates':['pages/staff/LmsStaffPages'],
'chief-home':['pages/chief/ChiefDashboard'],'chief-training-requests':['pages/chief/TrainingRequestsPage'],'chief-training-evaluation':['pages/chief/TrainingEvaluationPage'],'chief-lms-certify':['pages/chief/LmsChiefPages'],'chief-lms-practical':['pages/chief/LmsPracticalPage'],'chief-lms-progress':['pages/chief/LmsChiefPages','components/lms/LearnerTable'],'chief-talent-finder':['pages/TalentFinder'],'chief-individual-scores':['pages/chief/IndividualScoresPage'],'chief-team-skills':['pages/PhaseOneMatrix'],'chief-compare':['pages/CompareView'],'chief-yearly':['pages/YearlySkill'],'chief-job-summary':['pages/JobSummary'],'chief-team-directory':['pages/chief/ChiefPages','components/PeopleDirectory'],
'manager-home':['pages/manager/ExecutiveDashboard'],'manager-skill-approvals':['pages/SkillApprovals'],'manager-training-approvals':['pages/manager/TrainingApprovalsPage'],'manager-lms-dashboard':['pages/manager/LmsDashboard'],'manager-talent-finder':['pages/TalentFinder'],'manager-individual-scores':['pages/PhaseOneMatrix'],'manager-section-skills':['pages/PhaseOneMatrix'],'manager-compare':['pages/CompareView'],'manager-assessment-individual':['pages/manager/IndividualAssessmentPage'],'manager-assessment-section':['pages/manager/SectionAssessmentPage'],'manager-yearly':['pages/YearlySkill'],'manager-job-summary':['pages/JobSummary'],'manager-people-directory':['pages/manager/ManagerPages','components/PeopleDirectory'],
'admin-home':['pages/admin/AdminHome'],'admin-employees':['pages/PhaseOneEmployees'],'admin-master-data':['pages/MasterData'],'admin-skill-audit':['pages/SkillApprovals'],'admin-training-audit':['pages/admin/AdminPages'],'admin-reports':['pages/JobSummary'],'admin-lms-courses':['pages/admin/LmsAdminPages'],'admin-lms-enrollments':['pages/admin/LmsAdminPages','components/lms/LearnerTable'],'admin-lms-reports':['pages/admin/LmsAdminPages'],'admin-settings':['pages/PhaseOneSettings']};

test('every page has a registry entry and every listed permission is enforced in its screen',()=>{
  const missing=[];
  for(const page of Object.values(ROLE_PAGES).flat()){
    assert.ok(registry.PAGE_COMPONENTS[page.id],page.id);
    if(page.id===registry.LOCKED_PAGE)continue;
    const source=map[page.id].map(f=>fs.readFileSync('src/'+f+'.tsx','utf8')).join(' ');
    for(const item of registry.componentsOf(page.id))for(const action of item.actions){
      const tag=action==='view'?`<Can id="${item.id}"`:`<Can id="${item.id}" action="${action}"`;
      if(!source.includes(tag))missing.push(`${page.id}/${item.id}:${action}`);
    }
  }
  assert.deepEqual(missing,[]);
});
test('roles restrict pages, components and actions inside their base area only',()=>{
  let state=perms.createRole(perms.initialPermissions(),{name:'ผู้ตรวจ',base:'admin'},'r1');
  const role=()=>state.roles.find(r=>r.id==='r1');
  const apply=deny=>{state=perms.updateRole(state,'r1',{deny});};
  assert.ok(perms.allowed(role(),'admin-lms-courses','list','delete'));
  assert.ok(!perms.allowed(role(),'chief-home'),'ข้ามพื้นที่บทบาทไม่ได้');
  apply(perms.setPermission(role().deny,'admin-lms-courses','list','delete',false));
  assert.ok(!perms.allowed(role(),'admin-lms-courses','list','delete'));assert.ok(perms.allowed(role(),'admin-lms-courses','list','edit'));
  apply(perms.setPermission(role().deny,'admin-lms-courses','list','view',false));
  assert.ok(!perms.allowed(role(),'admin-lms-courses','list','edit'),'ปิดดู = ปิดทุกการกระทำ');
  apply(perms.setPermission(role().deny,'admin-lms-courses','list','edit',true));
  assert.ok(perms.allowed(role(),'admin-lms-courses','list'),'เปิดแก้ไข = เปิดดูด้วย');
  apply(perms.setPagePreset(role().deny,'admin-employees','view'));
  assert.ok(perms.allowed(role(),'admin-employees','table'));assert.ok(!perms.allowed(role(),'admin-employees','table','edit'));
  apply(perms.setPagePreset(role().deny,'admin-employees','none'));
  assert.ok(!perms.allowed(role(),'admin-employees'));assert.equal(perms.pageSummary(role().deny,'admin-employees','view'),'off');
  assert.ok(!perms.visiblePages(role()).some(p=>p.id==='admin-employees'));
  apply(perms.setPageAction(role().deny,'admin-employees','view',true));
  assert.equal(perms.pageSummary(role().deny,'admin-employees','view'),'on');
});
test('built-in admin cannot lock itself out; names stay unique; built-ins cannot be removed',()=>{
  let state=perms.initialPermissions();
  state=perms.updateRole(state,'admin',{deny:{[registry.LOCKED_PAGE]:['view']}});
  const admin=state.roles.find(r=>r.id==='admin');
  assert.ok(perms.allowed(admin,registry.LOCKED_PAGE,'manage'));
  assert.throws(()=>perms.deleteRole(state,'admin'),/มาตรฐาน/);
  state=perms.createRole(state,{name:'หัวหน้ากะ',base:'chief'},'a');
  assert.throws(()=>perms.createRole(state,{name:'หัวหน้ากะ',base:'chief'},'b'),/มีอยู่แล้ว/);
  assert.throws(()=>perms.createRole(state,{name:' ',base:'chief'},'c'),/ชื่อ/);
  assert.equal(perms.deleteRole(state,'a').roles.length,4);
});
