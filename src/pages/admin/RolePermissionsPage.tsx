import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Eye, Lock, Plus, Save, Search, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import type { Role } from '../../data/phase1Core';
import { ACTION_LABELS, componentsOf, LOCKED_PAGE, pagesOf, PERM_ACTIONS } from '../../data/permissionRegistry';
import type { PermAction } from '../../data/permissionRegistry';
import { allowed, BASE_NAMES, pageSummary, permissionActions, setPageAction, setPagePreset, setPermission, usePermissions, visiblePages } from '../../data/permissionStore';
import type { AccessRole, Deny, Preset } from '../../data/permissionStore';
import { Can } from '../../components/Permission';
import { buttonClass, Field, inputClass, panelClass } from '../../components/Phase1Shared';

const ghost = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
const mini = 'whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-40';

function Tick({ state, label, disabled, onChange }: { state: 'on' | 'off' | 'mixed'; label: string; disabled?: boolean; onChange: (allow: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = state === 'mixed'; }, [state]);
  return <input ref={ref} type="checkbox" aria-label={label} disabled={disabled} checked={state === 'on'} onChange={() => onChange(state !== 'on')} className="h-4.5 w-4.5 cursor-pointer disabled:cursor-not-allowed"/>;
}

function NewRole({ roles, onDone, onCancel }: { roles: AccessRole[]; onDone: (id: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [base, setBase] = useState<Role>('staff'); const [copyFrom, setCopyFrom] = useState(''); const [error, setError] = useState('');
  function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    try { onDone(permissionActions.create({ name, description, base, copyFrom: copyFrom || undefined })); } catch (e) { setError((e as Error).message); }
  }
  return <form onSubmit={submit} className={`${panelClass} grid gap-4 p-5 md:grid-cols-2`} aria-label="สร้างบทบาทใหม่">
    <h2 className="font-bold text-slate-900 md:col-span-2">สร้างบทบาทใหม่</h2>
    <Field label="ชื่อบทบาท"><input autoFocus maxLength={60} className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="เช่น หัวหน้ากะ, ผู้ตรวจสอบ (ดูอย่างเดียว)"/></Field>
    <Field label="คำอธิบาย (ไม่บังคับ)"><input maxLength={200} className={inputClass} value={description} onChange={e => setDescription(e.target.value)}/></Field>
    <Field label="อิงจากพื้นที่ใช้งาน"><select className={inputClass} value={base} onChange={e => { setBase(e.target.value as Role); setCopyFrom(''); }}>{(Object.keys(BASE_NAMES) as Role[]).map(r => <option key={r} value={r}>{BASE_NAMES[r]}</option>)}</select></Field>
    <Field label="คัดลอกสิทธิ์เริ่มต้นจาก"><select className={inputClass} value={copyFrom} onChange={e => setCopyFrom(e.target.value)}><option value="">เปิดทั้งหมด</option>{roles.filter(r => r.base === base).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
    <p className="text-xs leading-5 text-slate-500 md:col-span-2">พื้นที่ใช้งานกำหนดว่าบทบาทนี้มีหน้าใดบ้างและเห็นข้อมูลขอบเขตใด จากนั้นเลือกปิดสิทธิ์รายหน้าและรายส่วนประกอบได้</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}
    <div className="flex gap-2 md:col-span-2"><button className={buttonClass}>สร้างบทบาท</button><button type="button" className={ghost} onClick={onCancel}>ยกเลิก</button></div>
  </form>;
}

function Matrix({ role, deny, onChange }: { role: AccessRole; deny: Deny; onChange: (d: Deny) => void }) {
  const [open, setOpen] = useState<string[]>([]); const [query, setQuery] = useState('');
  const pages = pagesOf(role.base);
  const q = query.trim().toLowerCase();
  const shown = pages.filter(p => !q || p.title.toLowerCase().includes(q) || componentsOf(p.id).some(c => c.label.toLowerCase().includes(q)));
  const groups = [...new Set(shown.map(p => p.group))];
  const draft = { ...role, deny };
  const toggle = (id: string) => setOpen(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const preset = (kind: Preset, ids = pages.map(p => p.id)) => onChange(ids.filter(id => !(id === LOCKED_PAGE && role.id === 'admin')).reduce((d, id) => setPagePreset(d, id, kind), deny));
  const th = 'w-20 px-2 py-3 text-center text-xs font-semibold text-slate-500';
  return <section className={`${panelClass} overflow-hidden`} aria-label="ตารางสิทธิ์">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
      <div className="relative min-w-52 flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true"/><input type="search" aria-label="ค้นหาหน้าหรือส่วนประกอบ" className={`${inputClass} pl-9`} placeholder="ค้นหาชื่อหน้าหรือส่วนประกอบ" value={query} onChange={e => setQuery(e.target.value)}/></div>
      <button type="button" className={ghost} onClick={() => setOpen(open.length === pages.length ? [] : pages.map(p => p.id))}>{open.length === pages.length ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}</button>
      <button type="button" className={ghost} onClick={() => preset('all')}>เปิดทุกหน้า</button>
      <button type="button" className={ghost} onClick={() => preset('view')}>ดูอย่างเดียวทุกหน้า</button>
      <button type="button" className={ghost} onClick={() => preset('none')}>ปิดทุกหน้า</button>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
      <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">หน้า / ส่วนประกอบ</th>{PERM_ACTIONS.map(a => <th key={a} className={th}>{ACTION_LABELS[a]}</th>)}<th className="w-52 px-3 py-3 text-right text-xs font-semibold text-slate-500">ตั้งค่าทั้งหน้า</th></tr></thead>
      {groups.map(group => <tbody key={group}>
        <tr><th colSpan={6} scope="rowgroup" className="border-t border-slate-200 bg-blue-50/60 px-4 py-2 text-left text-xs font-bold text-blue-900">{group}</th></tr>
        {shown.filter(p => p.group === group).map(p => {
          const items = componentsOf(p.id); const locked = p.id === LOCKED_PAGE && role.id === 'admin';
          const expanded = open.includes(p.id) || !!q; const visibleCount = items.filter(c => allowed(draft, p.id, c.id)).length;
          return <Fragment key={p.id}>
            <tr className="border-t border-slate-100 hover:bg-slate-50/60" data-page={p.id}>
              <td className="px-4 py-2.5"><button type="button" onClick={() => toggle(p.id)} aria-expanded={expanded} className="flex items-center gap-2 text-left">{expanded ? <ChevronDown size={15} className="text-slate-400"/> : <ChevronRight size={15} className="text-slate-400"/>}<span><span className="block font-semibold text-slate-800">{p.title}</span><span className="block text-xs text-slate-500">{locked ? 'เปิดเสมอสำหรับผู้ดูแลระบบหลัก' : `เห็น ${visibleCount} จาก ${items.length} ส่วน`}</span></span>{locked && <Lock size={13} className="text-slate-400"/>}</button></td>
              {PERM_ACTIONS.map(a => { const s = locked ? (items.some(c => c.actions.includes(a)) ? 'on' : undefined) : pageSummary(deny, p.id, a);
                return <td key={a} className="text-center">{s ? <Tick state={s} disabled={locked} label={`${ACTION_LABELS[a]} · หน้า${p.title}`} onChange={allow => onChange(setPageAction(deny, p.id, a, allow))}/> : <span className="text-slate-300">–</span>}</td>; })}
              <td className="px-3 py-2.5"><div className="flex justify-end gap-1"><button type="button" disabled={locked} className={mini} onClick={() => preset('all', [p.id])}>ทั้งหมด</button><button type="button" disabled={locked} className={mini} onClick={() => preset('view', [p.id])}>ดูอย่างเดียว</button><button type="button" disabled={locked} className={mini} onClick={() => preset('none', [p.id])}>ปิด</button></div></td>
            </tr>
            {expanded && items.map(c => <tr key={c.id} className="border-t border-slate-50 bg-slate-50/40" data-component={`${p.id}/${c.id}`}>
              <td className="py-2 pl-12 pr-4"><p className="text-slate-700">{c.label}</p>{c.hints && Object.keys(c.hints).length > 0 && <p className="text-xs text-slate-400">{PERM_ACTIONS.filter(a => a !== 'view' && c.hints?.[a as 'create']).map(a => `${ACTION_LABELS[a]}: ${c.hints![a as 'create']}`).join(' · ')}</p>}</td>
              {PERM_ACTIONS.map((a: PermAction) => <td key={a} className="text-center">{c.actions.includes(a) ? <Tick state={locked || allowed(draft, p.id, c.id, a) ? 'on' : 'off'} disabled={locked} label={`${ACTION_LABELS[a]} · ${p.title} · ${c.label}`} onChange={allow => onChange(setPermission(deny, p.id, c.id, a, allow))}/> : <span className="text-slate-300">–</span>}</td>)}
              <td/>
            </tr>)}
          </Fragment>;
        })}
      </tbody>)}
      {!shown.length && <tbody><tr><td colSpan={6} className="p-8 text-center text-slate-500">ไม่พบหน้าหรือส่วนประกอบที่ค้นหา</td></tr></tbody>}
    </table></div>
  </section>;
}

function RoleDetail({ role, onSwitchRole, onRemoved }: { role: AccessRole; onSwitchRole?: (id: string) => void; onRemoved: () => void }) {
  const [name, setName] = useState(role.name); const [description, setDescription] = useState(role.description); const [deny, setDeny] = useState<Deny>(role.deny);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const dirty = name !== role.name || description !== role.description || JSON.stringify(deny) !== JSON.stringify(role.deny);
  const edit = (next: Deny) => { setDeny(next); setMessage(''); };
  function run(action: () => void, ok: string) { setError(''); setMessage(''); try { action(); setMessage(ok); } catch (e) { setError((e as Error).message); } }
  const save = () => run(() => permissionActions.update(role.id, { name, description, deny }), 'บันทึกสิทธิ์แล้ว มีผลทันทีกับผู้ที่ใช้บทบาทนี้');
  const total = pagesOf(role.base).length; const shown = visiblePages({ ...role, deny }).length;
  return <div className="min-w-0 space-y-4">
    <section className={`${panelClass} space-y-4 p-5`}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ชื่อบทบาท"><input maxLength={60} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`} disabled={role.builtin} value={name} onChange={e => setName(e.target.value)}/></Field>
        <Field label="คำอธิบาย"><input maxLength={200} className={inputClass} value={description} onChange={e => setDescription(e.target.value)}/></Field></div>
      <p className="text-xs text-slate-500">พื้นที่ใช้งาน: <strong className="text-slate-700">{BASE_NAMES[role.base]}</strong> · เปิดให้เห็น {shown} จาก {total} หน้า{role.builtin ? ' · บทบาทมาตรฐาน เปลี่ยนชื่อและลบไม่ได้' : ''}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} disabled={!dirty} onClick={save}><Save size={15}/>บันทึกสิทธิ์</button>
        <button type="button" className={ghost} disabled={!dirty} onClick={() => { setName(role.name); setDescription(role.description); setDeny(role.deny); setError(''); setMessage(''); }}><Undo2 size={15}/>ยกเลิกการแก้ไข</button>
        {onSwitchRole && <button type="button" className={ghost} disabled={dirty} title={dirty ? 'บันทึกก่อนจึงทดลองใช้ได้' : ''} onClick={() => onSwitchRole(role.id)}><Eye size={15}/>ทดลองใช้บทบาทนี้</button>}
        <button type="button" className={ghost} onClick={() => run(() => { permissionActions.create({ name: `${role.name} (สำเนา)`, description: role.description, base: role.base, copyFrom: role.id }); }, 'ทำสำเนาบทบาทแล้ว')}><Copy size={15}/>ทำสำเนา</button>
        {!role.builtin && <button type="button" className={`${ghost} text-red-700`} onClick={() => { if (window.confirm(`ลบบทบาท "${role.name}"? ผู้ที่ใช้บทบาทนี้จะกลับไปใช้บทบาทมาตรฐาน`)) run(() => { permissionActions.remove(role.id); onRemoved(); }, 'ลบบทบาทแล้ว'); }}><Trash2 size={15}/>ลบบทบาท</button>}
        {dirty && <span className="text-xs font-semibold text-amber-700">มีการแก้ไขที่ยังไม่บันทึก</span>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    </section>
    <Matrix role={role} deny={deny} onChange={edit}/>
  </div>;
}

export default function RolePermissionsPage({ onSwitchRole }: { onSwitchRole?: (id: string) => void }) {
  const { roles } = usePermissions();
  const [selected, setSelected] = useState('staff'); const [creating, setCreating] = useState(false);
  const role = roles.find(r => r.id === selected) ?? roles[0];
  return <Can id="manage"><div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><ShieldCheck/>สิทธิ์และบทบาท</h1><p className="mt-1 text-sm text-slate-500">สร้างบทบาทและกำหนดว่าแต่ละหน้า แต่ละส่วนประกอบ ใคร ดู สร้าง แก้ไข หรือลบได้</p></div>
      <button type="button" className={buttonClass} onClick={() => setCreating(true)}><Plus size={16}/>สร้างบทบาท</button></div>
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">โหมดสาธิต: สิทธิ์ชุดนี้ควบคุมการแสดงผลบนหน้าจอของเบราว์เซอร์นี้เท่านั้น ยังไม่ใช่การรักษาความปลอดภัย เมื่อใช้จริงต้องตรวจสิทธิ์ที่เซิร์ฟเวอร์ด้วย</p>
    {creating && <NewRole roles={roles} onCancel={() => setCreating(false)} onDone={id => { setSelected(id); setCreating(false); }}/>}
    <div className="grid items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <nav className={`${panelClass} p-2 xl:sticky xl:top-4`} aria-label="รายการบทบาท">
        {[true, false].map(builtin => { const list = roles.filter(r => r.builtin === builtin); return <div key={String(builtin)}>
          <p className="px-2 pb-1 pt-2 text-xs font-semibold text-slate-400">{builtin ? 'บทบาทมาตรฐาน' : `บทบาทที่สร้างเอง (${list.length})`}</p>
          {!list.length && <p className="px-2 pb-2 text-xs text-slate-400">ยังไม่มี</p>}
          <ul className="space-y-1">{list.map(r => <li key={r.id}><button type="button" aria-current={role.id === r.id} onClick={() => setSelected(r.id)} className={`w-full rounded-lg border px-3 py-2 text-left ${role.id === r.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}><span className="block text-sm font-semibold text-slate-800">{r.name}</span><span className="block text-xs text-slate-500">{visiblePages(r).length}/{pagesOf(r.base).length} หน้า{Object.keys(r.deny).length ? ' · ปรับสิทธิ์แล้ว' : ''}</span></button></li>)}</ul></div>; })}
      </nav>
      <RoleDetail key={role.id} role={role} onSwitchRole={onSwitchRole} onRemoved={() => setSelected('staff')}/>
    </div>
  </div></Can>;
}
