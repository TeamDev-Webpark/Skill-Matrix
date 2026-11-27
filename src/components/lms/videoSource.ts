export type VideoSource =
  | { kind: 'youtube'; id: string; start: number }
  | { kind: 'direct'; url: string }
  | { kind: 'file'; ref: string }                  // ไฟล์ที่อัปโหลดเก็บในเบราว์เซอร์ ('idb:…')
  | { kind: 'embed'; url: string; label: string };

/** แปลงลิงก์ที่แอดมินวางให้เป็นแหล่งวิดีโอ: YouTube / ไฟล์ตรง (.mp4 .webm .ogg .mov) / Vimeo / Google Drive */
export function parseVideoSource(raw?: string | null): VideoSource | null {
  let text = (raw ?? '').trim();
  if (!text) return null;
  if (text.startsWith('idb:')) return { kind: 'file', ref: text };
  const iframe = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframe) text = iframe[1].trim();
  // ไฟล์ที่มากับระบบ (พาธเดียวกับเว็บ) เช่น /demo-lms/xxx.webm
  if (/^\/(?!\/)[^?#]+\.(mp4|webm|ogg|mov|m4v)$/i.test(text)) return { kind: 'direct', url: text };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be' ? parts[0] : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : url.searchParams.get('v');
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return { kind: 'youtube', id, start: Number(url.searchParams.get('t') ?? url.searchParams.get('start') ?? 0) || 0 };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find(p => /^\d+$/.test(p));
    return id ? { kind: 'embed', url: `https://player.vimeo.com/video/${id}`, label: 'Vimeo' } : null;
  }
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    return id ? { kind: 'embed', url: `https://drive.google.com/file/d/${id}/preview`, label: 'Google Drive' } : null;
  }
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) return { kind: 'direct', url: url.toString() };
  return null;
}
export function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
