import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { parseArticle, safeImageSrc } from '../../data/lmsContent';
import { MediaImage } from './useMedia';

/** ตัวหนา **ข้อความ** (สร้างเป็น element ของ React เท่านั้น ไม่แทรก HTML) */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong> : part);
}
/* "หัวข้อ: รายละเอียด" ในรายการ จะเน้นคำหัวข้อให้อัตโนมัติ */
function item(text: string) {
  const at = text.indexOf(':'); const label = at > 0 && at < 40 && !text.includes('**') ? text.slice(0, at) : '';
  return label ? <><strong className="font-semibold text-slate-900">{label}</strong>{text.slice(at)}</> : inline(text);
}

export default function RichText({ text }: { text: string }) {
  return <div className="max-w-[70ch] space-y-5 text-[15px] leading-8 text-slate-700">{parseArticle(text).map((b, i) => {
    if (b.type === 'heading') return <h3 key={i} className="pt-2 text-lg font-bold leading-snug text-slate-900">{inline(b.text)}</h3>;
    if (b.type === 'callout') return <div key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><Info size={18} className="mt-1.5 shrink-0" aria-hidden="true"/><p>{inline(b.text)}</p></div>;
    if (b.type === 'image') return safeImageSrc(b.src) ? <figure key={i}><MediaImage src={b.src} alt={b.caption || 'ภาพประกอบ'} className="max-h-96 w-full border border-slate-200 bg-slate-50"/>{b.caption && <figcaption className="mt-1.5 text-center text-xs text-slate-500">{b.caption}</figcaption>}</figure> : null;
    if (b.type === 'bullets') return <ul key={i} className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">{b.items.map((x, k) => <li key={k} className="flex gap-3 leading-7"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"/><span>{item(x)}</span></li>)}</ul>;
    if (b.type === 'numbers') return <ol key={i} className="space-y-2">{b.items.map((x, k) => <li key={k} className="flex gap-3 leading-7"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{k + 1}</span><span>{item(x)}</span></li>)}</ol>;
    return <p key={i}>{inline(b.text)}</p>;
  })}</div>;
}
