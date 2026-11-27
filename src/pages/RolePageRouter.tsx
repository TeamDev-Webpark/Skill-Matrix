import type { ReactElement } from 'react';
import type { ScoreAssessmentScope } from '../data/skillAssessment';
import { roleCanVisit } from '../data/roleNavigation';
import { EmptyState } from '../components/Phase1Shared';
import { StaffHomePage, StaffSkillsPage, StaffYearlyPage } from './staff/StaffPages';
import StaffTrainingRequestPage from './staff/TrainingRequestPage';
import StaffTrainingTrackingPage from './staff/TrainingTrackingPage';
import StaffTrainingResultsPage from './staff/TrainingResultsPage';
import { ChiefHomePage, ChiefTeamSkillsPage, ChiefYearlyPage, ChiefJobSummaryPage, ChiefDirectoryPage } from './chief/ChiefPages';
import ChiefIndividualScoresPage from './chief/IndividualScoresPage';
import ChiefTrainingRequestsPage from './chief/TrainingRequestsPage';
import ChiefTrainingEvaluationPage from './chief/TrainingEvaluationPage';
import { ManagerHomePage, ManagerSkillApprovalsPage, ManagerIndividualScoresPage, ManagerSectionSkillsPage, ManagerYearlyPage, ManagerJobSummaryPage, ManagerDirectoryPage } from './manager/ManagerPages';
import IndividualAssessmentPage from './manager/IndividualAssessmentPage';
import SectionAssessmentPage from './manager/SectionAssessmentPage';
import ManagerTrainingApprovalsPage from './manager/TrainingApprovalsPage';
import { AdminHomePage, AdminEmployeesPage, AdminMasterDataPage, AdminSkillAuditPage, AdminReportsPage, AdminSettingsPage, AdminTrainingAuditPage } from './admin/AdminPages';
import CompareView from './CompareView';
import TalentFinder from './TalentFinder';
import { StaffLmsLearningPage, StaffLmsCatalogPage, StaffLmsCertificatesPage } from './staff/LmsStaffPages';
import { ChiefLmsCertifyPage, ChiefLmsProgressPage } from './chief/LmsChiefPages';
import ManagerLmsDashboard from './manager/LmsDashboard';
import RolePermissionsPage from './admin/RolePermissionsPage';
import { AccessScope } from '../components/Permission';
import { allowed, initialPermissions } from '../data/permissionStore';
import type { AccessRole } from '../data/permissionStore';
import ChiefLmsPracticalPage from './chief/LmsPracticalPage';
import { AdminLmsCoursesPage, AdminLmsEnrollmentsPage, AdminLmsReportsPage } from './admin/LmsAdminPages';

export default function RolePageRouter({page,role,access:granted,onNavigate,onSwitchRole,assessmentScope}:{page:string;role:string;access?:AccessRole;onNavigate:(page:string,scope?:ScoreAssessmentScope)=>void;onSwitchRole?:(id:string)=>void;assessmentScope?:ScoreAssessmentScope}) {
  if(!roleCanVisit(page,role)) return <EmptyState>หน้านี้ไม่อยู่ในพื้นที่ของบทบาทที่เลือก</EmptyState>;
  const access=granted??initialPermissions().roles.find(r=>r.base===role)!;
  if(!allowed(access,page)) return <EmptyState>บทบาท “{access.name}” ไม่มีสิทธิ์เปิดหน้านี้</EmptyState>;
  const pages:Record<string,ReactElement>={
    'staff-home':<StaffHomePage onNavigate={onNavigate}/>,
    'staff-my-skills':<StaffSkillsPage/>, 'staff-yearly':<StaffYearlyPage/>,
    'staff-training-request':<StaffTrainingRequestPage onNavigate={onNavigate}/>,
    'staff-training-tracking':<StaffTrainingTrackingPage onNavigate={onNavigate}/>,
    'staff-training-results':<StaffTrainingResultsPage/>,
    'staff-lms-learning':<StaffLmsLearningPage/>, 'staff-lms-catalog':<StaffLmsCatalogPage/>, 'staff-lms-certificates':<StaffLmsCertificatesPage/>,
    'chief-talent-finder':<TalentFinder userRole="chief"/>, 'manager-talent-finder':<TalentFinder userRole="manager"/>,
    'chief-lms-certify':<ChiefLmsCertifyPage/>, 'chief-lms-progress':<ChiefLmsProgressPage/>, 'chief-lms-practical':<ChiefLmsPracticalPage/>,
    'manager-lms-dashboard':<ManagerLmsDashboard onNavigate={onNavigate}/>,
    'admin-lms-courses':<AdminLmsCoursesPage/>, 'admin-lms-enrollments':<AdminLmsEnrollmentsPage/>, 'admin-lms-reports':<AdminLmsReportsPage/>,
    'chief-home':<ChiefHomePage onNavigate={onNavigate}/>, 'chief-training-requests':<ChiefTrainingRequestsPage/>,
    'chief-training-evaluation':<ChiefTrainingEvaluationPage/>, 'chief-team-skills':<ChiefTeamSkillsPage/>,
    'chief-individual-scores':<ChiefIndividualScoresPage/>, 'chief-compare':<CompareView userRole="chief" title="เปรียบเทียบทักษะ"/>, 'chief-yearly':<ChiefYearlyPage/>,
    'chief-job-summary':<ChiefJobSummaryPage/>, 'chief-team-directory':<ChiefDirectoryPage/>,
    'manager-home':<ManagerHomePage onNavigate={onNavigate}/>, 'manager-skill-approvals':<ManagerSkillApprovalsPage/>,
    'manager-training-approvals':<ManagerTrainingApprovalsPage/>, 'manager-section-skills':<ManagerSectionSkillsPage/>,
    'manager-individual-scores':<ManagerIndividualScoresPage/>, 'manager-compare':<CompareView userRole="manager" title="เปรียบเทียบทักษะ"/>,
    'manager-assessment-individual':<IndividualAssessmentPage initialScope={assessmentScope}/>, 'manager-assessment-section':<SectionAssessmentPage initialScope={assessmentScope}/>,
    'manager-yearly':<ManagerYearlyPage/>, 'manager-job-summary':<ManagerJobSummaryPage/>,
    'manager-people-directory':<ManagerDirectoryPage/>,
    'admin-home':<AdminHomePage onNavigate={onNavigate}/>, 'admin-employees':<AdminEmployeesPage/>,
    'admin-master-data':<AdminMasterDataPage/>,
    'admin-skill-audit':<AdminSkillAuditPage/>, 'admin-training-audit':<AdminTrainingAuditPage/>,
    'admin-reports':<AdminReportsPage/>, 'admin-settings':<AdminSettingsPage onNavigate={onNavigate}/>,
    'admin-permissions':<RolePermissionsPage onSwitchRole={onSwitchRole}/>,
  };
  return <AccessScope role={access} page={page}>{pages[page]??<EmptyState>ไม่พบหน้าที่เลือก</EmptyState>}</AccessScope>;
}
