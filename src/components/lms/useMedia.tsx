import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import { isMediaRef, loadMedia, prepareImage, saveMedia } from '../../data/lmsMedia';

/** แปลงตัวอ้างอิงสื่อ ('idb:…' หรือลิงก์) เป็น URL ที่ใช้แสดงได้ */
export function useMediaUrl(ref?: string): { url?: string; loading: boolean; failed: boolean } {
  const [state, setState] = useState<{ ref?: string; url?: string; failed: boolean }>({ failed: false });
  useEffect(() => {
    if (!ref) return;
    if (!isMediaRef(ref)) return;
    let alive = true; let objectUrl = '';
    loadMedia(ref).then(blob => { if (!alive) return; if (!blob) return setState({ ref, failed: true }); objectUrl = URL.createObjectURL(blob); setState({ ref, url: objectUrl, failed: false }); }).catch(() => alive && setState({ ref, failed: true }));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [ref]);
  if (!ref) return { loading: false, failed: false };
  if (!isMediaRef(ref)) return { url: ref, loading: false, failed: false };
  return state.ref === ref ? { url: state.url, loading: false, failed: state.failed } : { loading: true, failed: false };
}

export function MediaImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const { url, loading, failed } = useMediaUrl(src);
  if (!src) return null;
  if (loading) return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} style={{ minHeight: 80 }} aria-label="กำลังโหลดรูป"/>;
  if (failed || !url) return <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">ไม่พบไฟล์รูป (อาจอัปโหลดจากเบราว์เซอร์อื่น)</p>;
  return <img src={url} alt={alt} className={`rounded-lg object-contain ${className}`} loading="lazy"/>;
}

/** เลือกรูปจากเครื่อง (เก็บในเบราว์เซอร์) หรือวางลิงก์รูป */
export function ImagePicker({ value, onChange, label, compact = false }: { value?: string; onChange: (v?: string) => void; label: string; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [link, setLink] = useState<string | null>(null);
  async function pick(file?: File) {
    if (!file) return; setError(''); setBusy(true);
    try { onChange(await saveMedia(await prepareImage(file), file.name)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';
  return <div className="space-y-2">
    {value && <div className="relative inline-block max-w-full"><MediaImage src={value} alt={label} className={compact ? 'max-h-24' : 'max-h-56'}/></div>}
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={label} onChange={e => pick(e.target.files?.[0])}/>
      <button type="button" className={btn} disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={14}/>{busy ? 'กำลังเพิ่ม…' : value ? 'เปลี่ยนรูป' : compact ? 'เพิ่มรูป' : 'เพิ่มรูปจากเครื่อง'}</button>
      {!compact && link === null && <button type="button" className={btn} onClick={() => setLink('')}><Link2 size={14}/>ใช้ลิงก์รูป</button>}
      {value && <button type="button" className={`${btn} text-red-700`} onClick={() => onChange(undefined)}><Trash2 size={14}/>ลบรูป</button>}
    </div>
    {link !== null && <div className="flex gap-2"><input autoFocus className="w-full rounded-lg border border-blue-200 px-3 py-1.5 text-sm" placeholder="https://…/image.png" value={link} onChange={e => setLink(e.target.value)}/><button type="button" className={btn} onClick={() => { if (/^https?:\/\//i.test(link.trim())) { onChange(link.trim()); setLink(null); setError(''); } else setError('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'); }}>ใช้ลิงก์</button><button type="button" className={btn} onClick={() => setLink(null)}>ยกเลิก</button></div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
