import { useRef, useState } from 'react';
import { Bold, Heading2, ImagePlus, Info, List, ListOrdered } from 'lucide-react';
import { prepareImage, saveMedia } from '../../data/lmsMedia';
import RichText from './RichText';

const tool = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-40';

/** ตัวเขียนบทความ: ปุ่มจัดรูปแบบ แทรกรูป และดูตัวอย่างแบบที่ผู้เรียนเห็น */
export default function ArticleEditor({ value, onChange, label, rows = 12 }: { value: string; onChange: (v: string) => void; label: string; rows?: number }) {
  const area = useRef<HTMLTextAreaElement>(null); const picker = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  function apply(next: string, from: number, to: number) {
    onChange(next);
    requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(from, to); });
  }
  const lineEnd = (from: number) => { const at = value.indexOf('\n', from); return at < 0 ? value.length : at; };
  /** ใส่สัญลักษณ์หน้าทุกบรรทัดที่เลือก */
  function prefix(mark: (index: number) => string) {
    const el = area.current; if (!el) return;
    // ขยายให้ครอบทั้งบรรทัดเสมอ เคอร์เซอร์อยู่ตรงไหนของบรรทัดก็ได้
    const start = el.selectionStart ? value.lastIndexOf('\n', el.selectionStart - 1) + 1 : 0; const end = lineEnd(el.selectionEnd);
    const block = value.slice(start, end).split('\n').map((line, i) => mark(i) + line.replace(/^(## |> |- |\d+\.\s)/, '')).join('\n');
    apply(value.slice(0, start) + block + value.slice(end), start + block.length, start + block.length);
  }
  function bold() {
    const el = area.current; if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el; const picked = value.slice(a, b) || 'ข้อความเน้น';
    apply(`${value.slice(0, a)}**${picked}**${value.slice(b)}`, a + 2, a + 2 + picked.length);
  }
  async function image(file?: File) {
    if (!file) return; setError(''); setBusy(true);
    try {
      const ref = await saveMedia(await prepareImage(file), file.name);
      const at = lineEnd(area.current?.selectionEnd ?? value.length);   // แทรกหลังบรรทัดปัจจุบัน ไม่ตัดกลางประโยค
      const before = value.slice(0, at); const line = `${before && !before.endsWith('\n') ? '\n' : ''}![${file.name.replace(/\.[^.]+$/, '').replace(/[\]\[]/g, '')}](${ref})\n`;
      apply(before + line + value.slice(at).replace(/^\n/, ''), before.length + line.length, before.length + line.length);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-1.5">
    <p className="text-sm font-medium text-slate-600">{label}</p>
    <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label="จัดรูปแบบบทความ">
        <button type="button" className={tool} disabled={preview} onClick={() => prefix(() => '## ')}><Heading2 size={15}/>หัวข้อ</button>
        <button type="button" className={tool} disabled={preview} onClick={bold}><Bold size={14}/>ตัวหนา</button>
        <button type="button" className={tool} disabled={preview} onClick={() => prefix(() => '- ')}><List size={14}/>รายการ</button>
        <button type="button" className={tool} disabled={preview} onClick={() => prefix(i => `${i + 1}. `)}><ListOrdered size={14}/>ขั้นตอน</button>
        <button type="button" className={tool} disabled={preview} onClick={() => prefix(() => '> ')}><Info size={14}/>ข้อควรระวัง</button>
        <button type="button" className={tool} disabled={preview || busy} onClick={() => picker.current?.click()}><ImagePlus size={14}/>{busy ? 'กำลังเพิ่ม…' : 'แทรกรูป'}</button>
        <input ref={picker} type="file" accept="image/*" className="sr-only" aria-label="แทรกรูปในบทความ" onChange={e => { void image(e.target.files?.[0]); e.target.value = ''; }}/>
        <div className="ml-auto flex gap-1" role="tablist">{[false, true].map(mode => <button key={String(mode)} type="button" role="tab" aria-selected={preview === mode} onClick={() => setPreview(mode)} className={`rounded-md px-3 py-1 text-xs font-semibold ${preview === mode ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white'}`}>{mode ? 'ดูตัวอย่าง' : 'เขียน'}</button>)}</div>
      </div>
      {preview ? <div className="max-h-[28rem] overflow-y-auto p-4">{value.trim() ? <RichText text={value}/> : <p className="text-sm text-slate-400">ยังไม่มีเนื้อหา</p>}</div>
        : <textarea ref={area} rows={rows} aria-label={label} className="block w-full resize-y p-3 text-sm leading-7 text-slate-700 focus:outline-none" value={value} onChange={e => onChange(e.target.value)} placeholder="พิมพ์เนื้อหา แล้วเลือกบรรทัดเพื่อกดจัดรูปแบบ"/>}
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
