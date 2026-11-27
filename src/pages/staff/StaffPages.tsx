import MyScoresPage from './MyScoresPage';
import YearlySkill from '../YearlySkill';
export { default as StaffHomePage } from './StaffHome';
export function StaffSkillsPage(){return <MyScoresPage/>;}
export function StaffYearlyPage(){return <YearlySkill userRole="staff" title="พัฒนาการของฉัน"/>;}
