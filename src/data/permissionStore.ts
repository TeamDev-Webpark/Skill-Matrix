/** บทบาทและสิทธิ์การมองเห็น (โหมดสาธิต เก็บในเบราว์เซอร์ · ควบคุมหน้าจอเท่านั้น ไม่ใช่การรักษาความปลอดภัยฝั่งเซิร์ฟเวอร์)
 *  เก็บเฉพาะสิ่งที่ "ปิด" (deny) ส่วนประกอบใหม่จึงเปิดให้เห็นโดยอัตโนมัติ */
import { useSyncExternalStore } from 'react';
import type { Role } from './phase1Core';
import { componentsOf, LOCKED_PAGE, pagesOf, PERM_ACTIONS } from './permissionRegistry';
import type { PermAction } from './permissionRegistry';

export const BASE_NAMES: Record<Role, string> = { staff: 'พนักงาน (Staff)', chief: 'หัวหน้างาน (Section Chief)', manager: 'ผู้จัดการ (Department Manager)', admin: 'ผู้ดูแลระบบ (System Admin)' };
export type Deny = Record<string, PermAction[]>;       // คีย์: 'pageId' หรือ 'pageId/componentId'
export interface AccessRole { id: string; name: string; description: string; base: Role; builtin: boolean; deny: Deny }
export interface PermissionState { roles: AccessRole[] }

export const permKey = (pageId: string, componentId?: string) => componentId ? `${pageId}/${componentId}` : pageId;
const builtins = (): AccessRole[] => (Object.keys(BASE_NAMES) as Role[]).map(base => ({ id: base, name: BASE_NAMES[base], description: 'บทบาทมาตรฐานของระบบ', base, builtin: true, deny: {} }));
export const initialPermissions = (): PermissionState => ({ roles: builtins() });

/* ---------- ตรรกะล้วน ---------- */
export function allowed(role: AccessRole, pageId: string, componentId?: string, action: PermAction = 'view'): boolean {
  if (pageId === LOCKED_PAGE && role.id === 'admin') return true;
  if (!pagesOf(role.base).some(p => p.id === pageId)) return false;
  if (role.deny[pageId]?.includes('view')) return false;
  if (!componentId) return true;
  const denied = role.deny[permKey(pageId, componentId)] ?? [];
  return !denied.includes('view') && !denied.includes(action);
}
export const visiblePages = (role: AccessRole) => pagesOf(role.base).filter(p => allowed(role, p.id));

/** เปิด/ปิดสิทธิ์หนึ่งช่อง: ปิด "ดู" = ปิดทุกการกระทำของส่วนนั้น และเปิดการกระทำใดๆ จะเปิด "ดู" ให้ด้วย */
export function setPermission(deny: Deny, pageId: string, componentId: string | undefined, action: PermAction, allow: boolean): Deny {
  const key = permKey(pageId, componentId);
  const available = componentId ? componentsOf(pageId).find(x => x.id === componentId)?.actions ?? ['view'] : (['view'] as PermAction[]);
  const denied = new Set(deny[key] ?? []);
  if (allow) { denied.delete(action); denied.delete('view'); }
  else if (action === 'view') available.forEach(a => denied.add(a));
  else denied.add(action);
  const next = { ...deny };
  const list = PERM_ACTIONS.filter(a => denied.has(a) && available.includes(a));
  if (list.length) next[key] = list; else delete next[key];
  if (allow && componentId) delete next[pageId];          // เปิดส่วนย่อย ต้องเปิดหน้าด้วย
  return next;
}
export type Preset = 'all' | 'view' | 'none';
/** ตั้งค่าทั้งหน้าในครั้งเดียว: เปิดทั้งหมด / ดูอย่างเดียว / ปิดทั้งหน้า */
export function setPagePreset(deny: Deny, pageId: string, preset: Preset): Deny {
  const next = { ...deny };
  delete next[pageId];
  for (const item of componentsOf(pageId)) {
    const key = permKey(pageId, item.id);
    const list = preset === 'all' ? [] : preset === 'view' ? item.actions.filter(a => a !== 'view') : item.actions;
    if (list.length) next[key] = [...list]; else delete next[key];
  }
  if (preset === 'none') next[pageId] = ['view'];
  return next;
}
/** สถานะช่องติ๊กรวมของหน้า: 'on' ทุกส่วนเปิด, 'off' ปิดหมด, 'mixed' บางส่วน, undefined = หน้านี้ไม่มีการกระทำนั้น */
export function pageSummary(deny: Deny, pageId: string, action: PermAction): 'on' | 'off' | 'mixed' | undefined {
  const items = componentsOf(pageId).filter(x => x.actions.includes(action));
  if (!items.length) return undefined;
  if (deny[pageId]?.includes('view')) return 'off';
  const on = items.filter(x => { const d = deny[permKey(pageId, x.id)] ?? []; return !d.includes('view') && !d.includes(action); }).length;
  return on === items.length ? 'on' : on === 0 ? 'off' : 'mixed';
}
export function setPageAction(deny: Deny, pageId: string, action: PermAction, allow: boolean): Deny {
  if (action === 'view') return setPagePreset(deny, pageId, allow ? 'all' : 'none');
  return componentsOf(pageId).filter(x => x.actions.includes(action)).reduce((d, x) => setPermission(d, pageId, x.id, action, allow), deny);
}

export function createRole(state: PermissionState, input: { name: string; description?: string; base: Role; copyFrom?: string }, id = `role-${crypto.randomUUID().slice(0, 8)}`): PermissionState {
  const name = input.name.trim();
  if (!name) throw new Error('ระบุชื่อบทบาท');
  if (state.roles.some(r => r.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('ชื่อบทบาทนี้มีอยู่แล้ว');
  const source = state.roles.find(r => r.id === input.copyFrom && r.base === input.base);
  return { roles: [...state.roles, { id, name, description: input.description?.trim() ?? '', base: input.base, builtin: false, deny: structuredClone(source?.deny ?? {}) }] };
}
export function updateRole(state: PermissionState, id: string, patch: Partial<Pick<AccessRole, 'name' | 'description' | 'deny'>>): PermissionState {
  const role = state.roles.find(r => r.id === id);
  if (!role) throw new Error('ไม่พบบทบาท');
  const name = role.builtin ? role.name : (patch.name ?? role.name).trim();
  if (!name) throw new Error('ระบุชื่อบทบาท');
  if (state.roles.some(r => r.id !== id && r.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('ชื่อบทบาทนี้มีอยู่แล้ว');
  const deny = { ...(patch.deny ?? role.deny) };
  if (id === 'admin') { delete deny[LOCKED_PAGE]; delete deny[permKey(LOCKED_PAGE, 'manage')]; }
  return { roles: state.roles.map(r => r.id === id ? { ...r, ...patch, name, deny } : r) };
}
export function deleteRole(state: PermissionState, id: string): PermissionState {
  const role = state.roles.find(r => r.id === id);
  if (!role) throw new Error('ไม่พบบทบาท');
  if (role.builtin) throw new Error('ลบบทบาทมาตรฐานไม่ได้');
  return { roles: state.roles.filter(r => r.id !== id) };
}

/* ---------- store ---------- */
const KEY = 'skillmatrix.permissions.v1';
const listeners = new Set<() => void>();
function load(): PermissionState {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!data || !Array.isArray(data.roles)) return initialPermissions();
    const saved: AccessRole[] = data.roles.filter((r: AccessRole) => r && typeof r.id === 'string' && Object.hasOwn(BASE_NAMES, r.base));
    return { roles: [...builtins().map(b => ({ ...b, deny: saved.find(r => r.id === b.id)?.deny ?? {} })), ...saved.filter(r => !Object.hasOwn(BASE_NAMES, r.id)).map(r => ({ ...r, builtin: false, deny: r.deny ?? {} }))] };
  } catch { return initialPermissions(); }
}
let state = load();
const emit = () => listeners.forEach(l => l());
function commit(next: PermissionState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { throw new Error('บันทึกสิทธิ์ไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์'); }
  state = next; emit();
}
if (typeof window !== 'undefined') window.addEventListener?.('storage', event => { if (event.key === KEY || event.key === null) { state = load(); emit(); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function usePermissions() { return useSyncExternalStore(subscribe, () => state, () => state); }
export const permissionActions = {
  create: (input: Parameters<typeof createRole>[1]) => { const next = createRole(state, input); commit(next); return next.roles[next.roles.length - 1].id; },
  update: (id: string, patch: Parameters<typeof updateRole>[2]) => commit(updateRole(state, id, patch)),
  remove: (id: string) => commit(deleteRole(state, id)),
};
export const roleById = (s: PermissionState, id: string | null | undefined) => s.roles.find(r => r.id === id);
