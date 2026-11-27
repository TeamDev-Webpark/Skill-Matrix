import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Download, ExternalLink, FileText, Link2, Paperclip, Trash2 } from 'lucide-react';
import { moveItem, uid } from '../../data/lmsCore';
import type { Attachment } from '../../data/lmsCore';
import { MAX_IMAGE_MB, MAX_PDF_MB, prepareImage, saveMedia, validatePdfFile } from '../../data/lmsMedia';
import { inputClass } from '../Phase1Shared';
import { MediaImage, useMediaUrl } from './useMedia';

const sizeText = (size?: number) => !size ? '' : size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
const btn = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50';

function PdfCard({ file, opened, onOpened }: { file: Attachment; opened: boolean; onOpened: () => void }) {
  const [show, setShow] = useState(false);
  const { url, failed } = useMediaUrl(file.ref);
  return <li className="overflow-hidden rounded-xl border border-slate-200">
    <div className="flex flex-wrap items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"><FileText size={20} aria-hidden="true"/></span>
      <div className="min-w-0 flex-1 basis-48"><p className="truncate text-sm font-semibold text-slate-900" title={file.name}>{file.name}</p><p className="flex items-center gap-2 text-xs text-slate-500">PDF{file.size ? ` · ${sizeText(file.size)}` : ''}{opened && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check size={12}/>เปิดอ่านแล้ว</span>}</p></div>
      {failed ? <p className="text-xs text-amber-800">ไม่พบไฟล์ในเบราว์เซอร์นี้</p> : url && <div className="flex flex-wrap gap-2">
        <button type="button" className={`${btn} border-blue-200 text-blue-800`} aria-expanded={show} onClick={() => { setShow(!show); if (!show) onOpened(); }}>{show ? 'ปิดตัวอ่าน' : 'อ่านในหน้านี้'}</button>
        <a className={btn} href={url} target="_blank" rel="noreferrer" onClick={onOpened}><ExternalLink size={13}/>แท็บใหม่</a>
        <a className={btn} href={url} download={file.name.toLowerCase().endsWith('.pdf') ? file.name : `${file.name}.pdf`} onClick={onOpened} aria-label={`ดาวน์โหลด ${file.name}`}><Download size={13}/></a></div>}
    </div>
    {show && url && <iframe src={url} title={file.name} className="h-[70vh] w-full border-t border-slate-200 bg-slate-100"/>}
  </li>;
}

/** เอกสารและรูปแนบฝั่งผู้เรียน */
export function AttachmentViewer({ files, opened, onOpened }: { files: Attachment[]; opened: string[]; onOpened: (id: string) => void }) {
  const images = files.filter(f => f.kind === 'image'); const pdfs = files.filter(f => f.kind === 'pdf');
  return <section className="mt-7 space-y-3" aria-label="เอกสารและรูปประกอบ">
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Paperclip size={15}/>เอกสารและรูปประกอบ ({files.length})</h3>
    {images.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">{images.map(f => <li key={f.id}><figure className="rounded-xl border border-slate-200 bg-slate-50 p-2"><MediaImage src={f.ref} alt={f.name} className="h-52 w-full"/><figcaption className="mt-1.5 text-center text-xs text-slate-600">{f.name}</figcaption></figure></li>)}</ul>}
    {pdfs.length > 0 && <ul className="space-y-2">{pdfs.map(f => <PdfCard key={f.id} file={f} opened={opened.includes(f.id)} onOpened={() => onOpened(f.id)}/>)}</ul>}
  </section>;
}

/** จัดการไฟล์แนบฝั่งผู้ดูแล: ลากวางหลายไฟล์ เปลี่ยนชื่อ เรียงลำดับ */
export function AttachmentEditor({ files, onChange }: { files: Attachment[]; onChange: (files: Attachment[]) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [over, setOver] = useState(false); const [link, setLink] = useState('');
  async function add(list: FileList | null) {
    if (!list?.length) return; setError(''); setBusy(true);
    const added: Attachment[] = []; const problems: string[] = [];
    for (const file of Array.from(list)) {
      try {
        const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!pdf && !file.type.startsWith('image/')) throw new Error('รองรับเฉพาะ PDF และรูปภาพ');
        if (pdf) validatePdfFile(file);
        const blob = pdf ? file.slice(0, file.size, 'application/pdf') : await prepareImage(file);
        added.push({ id: uid('ATT'), kind: pdf ? 'pdf' : 'image', name: file.name.replace(/\.[^.]+$/, ''), size: blob.size, ref: await saveMedia(blob, file.name) });
      } catch (e) { problems.push(`${file.name}: ${(e as Error).message}`); }
    }
    if (added.length) onChange([...files, ...added]);
    setError(problems.join(' · ')); setBusy(false);
  }
  function addLink() {
    const url = link.trim();
    if (!/^https?:\/\/.+\.(pdf|png|jpe?g|webp|gif)(\?.*)?$/i.test(url)) return setError('ลิงก์ต้องขึ้นต้นด้วย http(s) และลงท้ายด้วย .pdf หรือนามสกุลรูปภาพ');
    const name = decodeURIComponent(url.split('?')[0].split('/').pop() ?? 'ไฟล์แนบ');
    onChange([...files, { id: uid('ATT'), kind: /\.pdf(\?.*)?$/i.test(url) ? 'pdf' : 'image', name: name.replace(/\.[^.]+$/, ''), ref: url }]); setLink(''); setError('');
  }
  const icon = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30';
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
    <p className="text-sm font-semibold text-slate-800">เอกสาร PDF และรูปแนบ ({files.length})</p>
    <label onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-5 text-center ${over ? 'border-blue-600 bg-blue-50' : 'border-blue-300 bg-white hover:bg-blue-50'}`}>
      <Paperclip size={20} className="text-blue-600" aria-hidden="true"/><span className="text-sm font-semibold text-slate-800">{busy ? 'กำลังบันทึกไฟล์…' : 'ลากไฟล์มาวาง หรือกดเพื่อเลือก'}</span><span className="text-xs text-slate-500">PDF ไม่เกิน {MAX_PDF_MB} MB · รูปภาพไม่เกิน {MAX_IMAGE_MB} MB · เลือกได้หลายไฟล์</span>
      <input type="file" multiple accept="application/pdf,.pdf,image/*" className="sr-only" aria-label="แนบไฟล์ PDF หรือรูปภาพ" disabled={busy} onChange={e => { void add(e.target.files); e.target.value = ''; }}/></label>
    <div className="flex gap-2"><input className={inputClass} aria-label="ลิงก์ไฟล์แนบ" placeholder="หรือวางลิงก์ .pdf / รูปภาพ" value={link} onChange={e => setLink(e.target.value)}/><button type="button" className={btn} disabled={!link.trim()} onClick={addLink}><Link2 size={13}/>เพิ่มลิงก์</button></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {files.length > 0 && <ul className="space-y-2">{files.map((f, i) => <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
      <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${f.kind === 'pdf' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{f.kind === 'pdf' ? 'PDF' : 'รูป'}</span>
      <input className={`${inputClass} min-w-40 flex-1`} aria-label={`ชื่อไฟล์แนบ ${i + 1}`} value={f.name} onChange={e => onChange(files.map(x => x.id === f.id ? { ...x, name: e.target.value } : x))}/>
      <span className="w-16 text-right text-xs text-slate-500">{sizeText(f.size)}</span>
      <button type="button" className={icon} aria-label={`เลื่อนไฟล์ ${i + 1} ขึ้น`} disabled={i === 0} onClick={() => onChange(moveItem(files, i, -1))}><ArrowUp size={14}/></button>
      <button type="button" className={icon} aria-label={`เลื่อนไฟล์ ${i + 1} ลง`} disabled={i === files.length - 1} onClick={() => onChange(moveItem(files, i, 1))}><ArrowDown size={14}/></button>
      <button type="button" className={`${icon} text-red-600`} aria-label={`ลบไฟล์แนบ ${i + 1}`} onClick={() => onChange(files.filter(x => x.id !== f.id))}><Trash2 size={14}/></button>
    </li>)}</ul>}
  </div>;
}
