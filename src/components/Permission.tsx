import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { allowed } from '../data/permissionStore';
import type { AccessRole } from '../data/permissionStore';
import type { PermAction } from '../data/permissionRegistry';

const AccessContext = createContext<{ role: AccessRole; page: string } | null>(null);

export function AccessScope({ role, page, children }: { role: AccessRole; page: string; children: ReactNode }) {
  return <AccessContext.Provider value={{ role, page }}>{children}</AccessContext.Provider>;
}
/** แสดงเนื้อหาเมื่อบทบาทปัจจุบันมีสิทธิ์ในส่วนประกอบนี้ของหน้าปัจจุบัน (นอก AccessScope = แสดงเสมอ) */
export function Can({ id, action = 'view', children }: { id: string; action?: PermAction; children: ReactNode }) {
  const access = useContext(AccessContext);
  return !access || allowed(access.role, access.page, id, action) ? <>{children}</> : null;
}
