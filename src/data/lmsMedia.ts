import type { Course } from './lmsCore';
import { articleImages } from './lmsContent';

/**
 * คลังไฟล์สื่อ (วิดีโอ/รูป) ของ LMS เก็บใน IndexedDB ของเบราว์เซอร์ ข้อมูลหลักสูตรอ้างอิงด้วย 'idb:<uuid>'
 * ข้อจำกัด: ไฟล์อยู่เฉพาะเบราว์เซอร์/เครื่องที่อัปโหลด ถ้าต้องแชร์ข้ามเครื่องต้องย้ายไปเก็บบน server
 */
const DB_NAME = 'skillmatrix-lms-media'; const STORE = 'files';
export const MAX_VIDEO_MB = 500; export const MAX_IMAGE_MB = 10; export const MAX_PDF_MB = 30;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v'];

export const isMediaRef = (value?: string | null): value is string => !!value && value.startsWith('idb:');
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('เบราว์เซอร์นี้ไม่รองรับการเก็บไฟล์'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('เปิดที่เก็บไฟล์ไม่ได้'));
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode); const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req.result); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error ?? new Error('บันทึกไฟล์ไม่สำเร็จ (พื้นที่เก็บอาจเต็ม)')); };
  });
}
export async function saveMedia(blob: Blob, name = ''): Promise<string> {
  const id = `idb:${crypto.randomUUID()}`;
  await tx('readwrite', s => s.put({ id, blob, name, type: blob.type, size: blob.size, createdAt: Date.now() }));
  return id;
}
export async function loadMedia(ref: string): Promise<Blob | undefined> {
  const row = await tx<{ blob: Blob } | undefined>('readonly', s => s.get(ref));
  return row?.blob;
}
/** ลบไฟล์ที่ไม่มีหลักสูตรใดอ้างอิงแล้ว */
export async function gcMedia(used: Set<string>) {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', s => s.getAllKeys());
    await Promise.all(keys.filter(k => typeof k === 'string' && !used.has(k)).map(k => tx('readwrite', s => s.delete(k))));
  } catch { /* ไม่กระทบการใช้งาน */ }
}
export function collectMediaRefs(courses: Course[]): Set<string> {
  const refs = new Set<string>();
  const add = (v?: string) => { if (isMediaRef(v)) refs.add(v); };
  for (const c of courses) {
    c.lessons.forEach(l => { add(l.videoUrl); l.attachments?.forEach(a => add(a.ref)); articleImages(l.body).forEach(add); });
    c.questions.forEach(q => { add(q.image); q.choiceImages?.forEach(add); });
  }
  return refs;
}

/** ย่อรูปให้เล็กลง (ด้านยาวสุด 1280px) เพื่อประหยัดพื้นที่; SVG/GIF คงเดิม */
export async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('เลือกไฟล์รูปภาพเท่านั้น');
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`รูปใหญ่เกิน ${MAX_IMAGE_MB} MB`);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.85));
  return blob && blob.size < file.size ? blob : file;
}
export function validatePdfFile(file: File) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('รองรับไฟล์ .pdf เท่านั้น');
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_PDF_MB} MB`);
}
export function validateVideoFile(file: File) {
  if (!VIDEO_TYPES.includes(file.type) && !/\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name)) throw new Error('รองรับไฟล์ .mp4 .webm .ogg .mov เท่านั้น');
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_VIDEO_MB} MB (ไฟล์นี้ ${(file.size / 1048576).toFixed(0)} MB)`);
}
export function readVideoDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const v = document.createElement('video'); v.preload = 'metadata';
    const done = (d: number) => { URL.revokeObjectURL(url); Number.isFinite(d) && d > 0 ? resolve(d) : reject(new Error('อ่านความยาววิดีโอไม่ได้')); };
    // WebM จาก MediaRecorder ไม่มีความยาวในไฟล์ (Infinity) ต้องกรอไปท้ายไฟล์เพื่อให้เบราว์เซอร์คำนวณ
    v.onloadedmetadata = () => { if (Number.isFinite(v.duration)) return done(v.duration); v.ontimeupdate = () => { if (Number.isFinite(v.duration)) { v.ontimeupdate = null; done(v.duration); } }; v.currentTime = 1e101; };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เบราว์เซอร์เปิดไฟล์วิดีโอนี้ไม่ได้ ลองแปลงเป็น MP4 (H.264)')); };
    v.src = url;
  });
}
