import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Maximize, Minimize, Pause, Play, RotateCcw, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import type { Checkpoint, Lesson } from '../../data/lmsCore';
import { buttonClass } from '../Phase1Shared';
import { useMediaUrl } from './useMedia';
import { formatTime, parseVideoSource } from './videoSource';

interface Controller { time(): number; duration(): number; playing(): boolean; pause(): void; play(): void; seek(sec: number): void; setRate(r: number): void; setMuted(m: boolean): void; setVolume(v: number): void }
export type VideoDone = { checkpointCorrect: number; checkpointTotal: number; watchedPct: number };
interface YTPlayer { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; pauseVideo(): void; playVideo(): void; seekTo(s: number, allow: boolean): void; setPlaybackRate(r: number): void; mute(): void; unMute(): void; setVolume(v: number): void; destroy(): void }
declare global { interface Window { YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: { ENDED: number } }; onYouTubeIframeAPIReady?: () => void } }

let ytLoading: Promise<void> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  ytLoading ??= new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { ytLoading = null; reject(new Error('โหลดเครื่องเล่น YouTube ไม่ได้ ตรวจสอบอินเทอร์เน็ต')); };
    document.head.appendChild(script);
  });
  return ytLoading;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SAVE_PREFIX = 'lms.vp.v1.';
type Saved = { max: number; covered: number[]; answered: Record<string, boolean> };
function readSaved(key?: string): Saved | null { if (!key) return null; try { const v = JSON.parse(localStorage.getItem(SAVE_PREFIX + key) ?? 'null'); return v && Array.isArray(v.covered) ? v : null; } catch { return null; } }

/**
 * เครื่องเล่นวิดีโอของ LMS — ตรวจการดูจริง:
 * 1) กรอข้ามไปข้างหน้าไม่ได้ (เกินจุดที่ดูแล้ว) ย้อนกลับได้
 * 2) นับ "วินาทีที่ได้ดูจริง" แบบไม่ซ้ำ เล่นเฉพาะตอนแท็บเปิดอยู่ (สลับแท็บ = หยุดอัตโนมัติ)
 * 3) ต้องดูครบตาม % ที่ตั้งไว้ และตอบจุดคำถามครบ จึงนับว่าเรียนจบ
 * 4) ก่อนเรียนจบใช้ความเร็ว 1x เท่านั้น · จำตำแหน่งที่ดูไว้เมื่อรีเฟรช
 * รองรับไฟล์ที่อัปโหลด (.mp4/.webm), ลิงก์ไฟล์วิดีโอ และ YouTube; Vimeo/Drive ติดตามไม่ได้ จึงใช้เวลาขั้นต่ำ + ยืนยัน
 */
export default function VideoPlayer({ lesson, done, progressKey, onComplete }: { lesson: Lesson; done: boolean; progressKey?: string; onComplete: (info: VideoDone) => void }) {
  const source = useMemo(() => parseVideoSource(lesson.videoUrl), [lesson.videoUrl]);
  const media = useMediaUrl(source?.kind === 'file' ? source.ref : undefined);
  const htmlUrl = source?.kind === 'direct' ? source.url : source?.kind === 'file' ? media.url : undefined;
  const checkpoints = useMemo(() => [...lesson.checkpoints].sort((a, b) => a.timeSec - b.timeSec), [lesson.checkpoints]);
  const required = Math.min(100, Math.max(1, lesson.requiredWatchPct ?? 90));

  const ctl = useRef<Controller | null>(null);
  const wrap = useRef<HTMLDivElement>(null); const videoRef = useRef<HTMLVideoElement>(null); const ytHost = useRef<HTMLDivElement>(null);
  const saved = useRef<Saved | null>(done ? null : readSaved(progressKey));
  const maxWatched = useRef(saved.current?.max ?? 0);
  const covered = useRef(new Set<number>(saved.current?.covered ?? []));
  const lastT = useRef(saved.current?.max ?? 0);
  const finished = useRef(false); const tickCount = useRef(0); const resumed = useRef(false);

  const [playing, setPlaying] = useState(false); const [cur, setCur] = useState(0); const [dur, setDur] = useState(0);
  const [cover, setCover] = useState(() => 0); const [maxW, setMaxW] = useState(maxWatched.current);
  const [rate, setRate] = useState(1); const [muted, setMuted] = useState(false); const [volume, setVolume] = useState(1); const [fs, setFs] = useState(false);
  const [ready, setReady] = useState(false); const [ended, setEnded] = useState(false);
  const [active, setActive] = useState<Checkpoint | null>(null); const [picked, setPicked] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Record<string, boolean>>(saved.current?.answered ?? {});
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [dwell, setDwell] = useState(0);
  const answeredRef = useRef(answered); const activeRef = useRef(active); const doneRef = useRef(done);
  useEffect(() => { answeredRef.current = answered; activeRef.current = active; doneRef.current = done; }, [answered, active, done]);

  const correct = Object.values(answered).filter(Boolean).length; const unanswered = checkpoints.length - Object.keys(answered).length;
  const tracked = source?.kind === 'direct' || source?.kind === 'file' || source?.kind === 'youtube';
  const canSpeed = done;

  useEffect(() => { const t = window.setInterval(() => setDwell(x => x + 1), 1000); return () => window.clearInterval(t); }, []);

  /* ---------- ผูก controller ---------- */
  useEffect(() => {
    if (!source || source.kind === 'embed') return;
    if (source.kind === 'youtube') {
      let yt: YTPlayer | null = null; let cancelled = false; setReady(false);
      loadYouTubeApi().then(() => {
        if (cancelled || !ytHost.current) return;
        const el = document.createElement('div'); ytHost.current.replaceChildren(el);
        yt = new window.YT!.Player(el, { videoId: source.id, width: '100%', height: '100%', playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1 },
          events: { onReady: () => { setReady(true); setDur(yt?.getDuration() ?? 0); }, onStateChange: (e: { data: number }) => { if (e.data === window.YT!.PlayerState.ENDED) setEnded(true); }, onError: () => setError('เล่นวิดีโอ YouTube นี้ไม่ได้ (อาจปิดการฝังหรือเป็นวิดีโอส่วนตัว)') } });
        ctl.current = { time: () => yt?.getCurrentTime?.() ?? 0, duration: () => yt?.getDuration?.() ?? 0, playing: () => yt?.getPlayerState?.() === 1, pause: () => yt?.pauseVideo?.(), play: () => yt?.playVideo?.(), seek: s => yt?.seekTo?.(s, true),
          setRate: r => yt?.setPlaybackRate?.(r), setMuted: m => (m ? yt?.mute?.() : yt?.unMute?.()), setVolume: v => yt?.setVolume?.(v * 100) };
      }).catch(e => setError((e as Error).message));
      return () => { cancelled = true; yt?.destroy?.(); ctl.current = null; };
    }
    const v = videoRef.current; if (!v || !htmlUrl) return;
    ctl.current = { time: () => v.currentTime, duration: () => v.duration, playing: () => !v.paused && !v.ended, pause: () => v.pause(), play: () => { void v.play().catch(() => undefined); }, seek: s => { v.currentTime = s; },
      setRate: r => { v.playbackRate = r; }, setMuted: m => { v.muted = m; }, setVolume: x => { v.volume = x; } };
    return () => { ctl.current = null; };
  }, [source, htmlUrl]);

  const save = useCallback(() => { if (!progressKey || doneRef.current) return; try { localStorage.setItem(SAVE_PREFIX + progressKey, JSON.stringify({ max: maxWatched.current, covered: [...covered.current], answered: answeredRef.current })); } catch { /* ไม่กระทบการใช้งาน */ } }, [progressKey]);

  /* ---------- ตรวจการดูทุก 250ms ---------- */
  useEffect(() => {
    if (!tracked) return;
    const timer = window.setInterval(() => {
      const c = ctl.current; if (!c) return;
      const t = c.time(); const d = c.duration(); if (!Number.isFinite(t)) return;
      const isPlaying = c.playing(); setPlaying(isPlaying); setCur(t);
      if (Number.isFinite(d) && d > 0) setDur(d);
      if (!doneRef.current && t > maxWatched.current + 2.5) { c.seek(maxWatched.current); lastT.current = maxWatched.current; setNotice('กรอข้ามไปข้างหน้าไม่ได้ ต้องดูตามลำดับ (ย้อนกลับได้)'); return; }
      if (isPlaying && !document.hidden && t >= lastT.current - 0.01 && t - lastT.current < 2.5) { for (let s = Math.floor(lastT.current); s <= Math.floor(t); s++) covered.current.add(s); }
      lastT.current = t; if (t > maxWatched.current) { maxWatched.current = t; }
      if (Number.isFinite(d) && d > 0) { setCover(Math.min(100, Math.round((covered.current.size / Math.ceil(d)) * 100))); setMaxW(maxWatched.current); }
      if (!doneRef.current && !activeRef.current) {
        const due = checkpoints.find(cp => answeredRef.current[cp.id] === undefined && t >= cp.timeSec);
        if (due) { c.pause(); setActive(due); setPicked(null); }
      }
      if (Number.isFinite(d) && d > 0 && t >= d - 0.4 && !c.playing()) setEnded(true);
      if (++tickCount.current % 12 === 0) save();
    }, 250);
    return () => { window.clearInterval(timer); save(); };
  }, [tracked, checkpoints, save]);

  /* หยุดเมื่อสลับแท็บ + ติดตามโหมดเต็มจอ */
  useEffect(() => {
    const onHide = () => { if (document.hidden && ctl.current?.playing()) { ctl.current.pause(); setNotice('หยุดเล่นอัตโนมัติเพราะคุณสลับออกจากหน้านี้ · เวลาที่ไม่ได้ดูจะไม่ถูกนับ'); } };
    const onFs = () => setFs(document.fullscreenElement === wrap.current);
    document.addEventListener('visibilitychange', onHide); document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('visibilitychange', onHide); document.removeEventListener('fullscreenchange', onFs); };
  }, []);

  /* เล่นต่อจากจุดที่ดูค้าง (ไฟล์วิดีโอ) */
  function onLoadedMetadata() {
    const v = videoRef.current; if (!v) return;
    if (!Number.isFinite(v.duration)) { // WebM ที่ไม่มีความยาวในไฟล์: กรอไปท้ายไฟล์ครั้งเดียวเพื่อให้รู้ความยาว
      v.ontimeupdate = () => { if (Number.isFinite(v.duration)) { v.ontimeupdate = null; v.currentTime = 0; setDur(v.duration); setReady(true); } };
      v.currentTime = 1e101; return;
    }
    setDur(v.duration); setReady(true);
    if (!resumed.current && !done && maxWatched.current > 3 && maxWatched.current < v.duration - 1) { v.currentTime = maxWatched.current; setNotice(`เล่นต่อจากจุดที่ดูค้างไว้ (${formatTime(maxWatched.current)})`); }
    resumed.current = true;
  }

  /* ---------- เรียนจบ ---------- */
  const coverOk = cover >= required;
  useEffect(() => {
    if (done || finished.current || !ended || !coverOk || unanswered > 0 || active) return;
    finished.current = true; try { localStorage.removeItem(SAVE_PREFIX + (progressKey ?? '')); } catch { /* ไม่กระทบการใช้งาน */ }
    onComplete({ checkpointCorrect: correct, checkpointTotal: checkpoints.length, watchedPct: cover });
  }, [ended, coverOk, unanswered, active, done, onComplete, correct, checkpoints.length, cover, progressKey]);

  /* ---------- การควบคุม ---------- */
  const toggle = () => { const c = ctl.current; if (!c || active) return; setNotice(''); if (c.playing()) c.pause(); else { if (ended) { setEnded(false); } c.play(); } };
  function seekTo(t: number) {
    const c = ctl.current; if (!c || !dur) return;
    const limit = done ? dur : maxWatched.current;
    if (t > limit + 0.5) { setNotice('ยังไม่ได้ดูถึงจุดนี้ กรอข้ามไม่ได้'); t = limit; }
    c.seek(Math.max(0, t)); lastT.current = Math.max(0, t); setCur(t); setEnded(false);
  }
  function jumpToUnwatched() {
    const total = Math.ceil(dur); for (let s = 0; s < total; s++) if (!covered.current.has(s)) { seekTo(s); ctl.current?.play(); setNotice(''); return; }
  }
  function changeRate(r: number) { setRate(r); ctl.current?.setRate(r); }
  function toggleMute() { const m = !muted; setMuted(m); ctl.current?.setMuted(m); }
  function changeVolume(v: number) { setVolume(v); ctl.current?.setVolume(v); if (v > 0 && muted) { setMuted(false); ctl.current?.setMuted(false); } }
  function fullscreen() { if (document.fullscreenElement) void document.exitFullscreen(); else void wrap.current?.requestFullscreen?.(); }
  function answer(cp: Checkpoint) { if (picked !== null) setAnswered(a => ({ ...a, [cp.id]: picked === cp.answerIndex })); }
  function resume() { setActive(null); setPicked(null); ctl.current?.play(); }
  function onBarKey(e: React.KeyboardEvent) { if (e.key === 'ArrowLeft') { e.preventDefault(); seekTo(cur - 5); } else if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(cur + 5); } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }
  function onBarClick(e: React.MouseEvent<HTMLDivElement>) { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * dur); }

  if (!source) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ลิงก์หรือไฟล์วิดีโอของบทเรียนนี้ไม่ถูกต้องหรือยังไม่ได้ตั้งค่า กรุณาแจ้งผู้ดูแลระบบ</p>;
  if (source.kind === 'file' && media.failed) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ไม่พบไฟล์วิดีโอในเบราว์เซอร์นี้ (ไฟล์ที่อัปโหลดเก็บในเบราว์เซอร์ที่ผู้ดูแลระบบใช้อัปโหลด) กรุณาแจ้งผู้ดูแลระบบให้อัปโหลดใหม่หรือใช้ลิงก์วิดีโอแทน</p>;

  /* Vimeo / Google Drive: ติดตามเวลาไม่ได้ */
  if (source.kind === 'embed') {
    const need = Math.max(lesson.minSeconds, 0);
    return <div className="space-y-3"><div className="aspect-video overflow-hidden rounded-2xl bg-slate-900"><iframe title={lesson.title} src={source.url} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/></div>
      {!done ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"><span className="flex-1 text-slate-600">วิดีโอจาก {source.label} ระบบตรวจการดูอัตโนมัติไม่ได้ · ดูให้จบแล้วยืนยัน{dwell < need ? ` (ยืนยันได้ในอีก ${need - dwell} วินาที)` : ''}</span><button className={buttonClass} disabled={dwell < need} onClick={() => onComplete({ checkpointCorrect: 0, checkpointTotal: 0, watchedPct: 100 })}>ฉันดูวิดีโอจบแล้ว</button></div>
        : <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16}/>เรียนบทเรียนนี้จบแล้ว</p>}</div>;
  }

  const pct = (t: number) => (dur > 0 ? Math.min(100, (t / dur) * 100) : 0);
  const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40';
  return <div className="space-y-3">
    <div ref={wrap} className={`overflow-hidden rounded-2xl bg-slate-950 shadow-lg ${fs ? 'flex h-full w-full flex-col' : ''}`}>
      <div className={`relative bg-black ${fs ? 'min-h-0 flex-1' : 'aspect-video'}`} onClick={toggle} onContextMenu={e => e.preventDefault()}>
        {source.kind === 'youtube' ? <div ref={ytHost} className="pointer-events-none h-full w-full [&_iframe]:h-full [&_iframe]:w-full"/>
          : htmlUrl ? <video ref={videoRef} src={htmlUrl} playsInline preload="metadata" disablePictureInPicture controlsList="nodownload noplaybackrate" className="h-full w-full" onLoadedMetadata={onLoadedMetadata} onEnded={() => setEnded(true)} onError={() => setError('เปิดไฟล์วิดีโอไม่ได้ ตรวจสอบรูปแบบไฟล์ (แนะนำ MP4 H.264) หรือลิงก์')}/>
          : <div className="flex h-full items-center justify-center text-sm text-slate-300">กำลังโหลดวิดีโอ…</div>}
        {!playing && !active && !error && (ready || source.kind === 'direct') && <button type="button" aria-label={ended ? 'เล่นอีกครั้ง' : 'เล่นวิดีโอ'} onClick={e => { e.stopPropagation(); toggle(); }} className="absolute inset-0 flex items-center justify-center bg-black/30 text-white"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-blue-700 shadow-xl transition-transform hover:scale-105">{ended ? <RotateCcw size={32}/> : <Play size={34} className="ml-1" fill="currentColor"/>}</span></button>}
      </div>
      <div className="bg-slate-900 px-3 pb-2 pt-3 text-white">
        <div role="slider" tabIndex={0} aria-label="ตำแหน่งวิดีโอ" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(cur)} aria-valuetext={`${formatTime(cur)} จาก ${formatTime(dur)}`} onKeyDown={onBarKey} onClick={onBarClick}
          className="group relative h-3 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-600">
            <div className="absolute inset-y-0 left-0 bg-slate-400" style={{ width: `${pct(done ? dur : maxW)}%` }}/><div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${pct(cur)}%` }}/></div>
          {checkpoints.map(cp => <span key={cp.id} title={`จุดคำถาม ${formatTime(cp.timeSec)}`} className={`absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm ${answered[cp.id] === undefined ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ left: `${pct(cp.timeSec)}%` }}/>)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <button type="button" className={iconBtn} aria-label={playing ? 'หยุดชั่วคราว' : 'เล่น'} onClick={toggle} disabled={!!active}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
          <button type="button" className={iconBtn} aria-label="ย้อนกลับ 10 วินาที" onClick={() => seekTo(cur - 10)}><RotateCcw size={16}/></button>
          <span className="px-2 text-xs tabular-nums text-slate-200">{formatTime(cur)} / {formatTime(dur)}</span>
          <div className="ml-auto flex items-center gap-1">
            <label className="flex items-center text-xs text-slate-300"><span className="sr-only">ความเร็ว</span>
              <select disabled={!canSpeed} title={canSpeed ? 'ความเร็วในการเล่น' : 'ใช้ความเร็ว 1x จนกว่าจะเรียนบทนี้จบ'} value={rate} onChange={e => changeRate(Number(e.target.value))} className="rounded-md border border-white/20 bg-slate-800 px-1.5 py-1 text-xs text-white disabled:opacity-50">{RATES.map(r => <option key={r} value={r}>{r}x</option>)}</select></label>
            <button type="button" className={iconBtn} aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'} onClick={toggleMute}>{muted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label="ระดับเสียง" onChange={e => changeVolume(Number(e.target.value))} className="hidden w-20 sm:block"/>
            <button type="button" className={iconBtn} aria-label={fs ? 'ออกจากเต็มจอ' : 'เต็มจอ'} onClick={fullscreen}>{fs ? <Minimize size={18}/> : <Maximize size={18}/>}</button></div></div>
      </div>
      {active && <div role="dialog" aria-label="คำถามระหว่างวิดีโอ" className="space-y-3 bg-white p-5 text-slate-900">
        <p className="text-xs font-semibold text-blue-700">จุดคำถามที่ {formatTime(active.timeSec)} · ตอบก่อนจึงดูต่อได้</p>
        <p className="text-base font-semibold">{active.question}</p>
        {answered[active.id] === undefined
          ? <><div className="grid gap-2">{active.choices.map((c, i) => c.trim() && <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm ${picked === i ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}><input type="radio" className="sr-only" name={active.id} checked={picked === i} onChange={() => setPicked(i)}/><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${picked === i ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>{picked === i && <span className="h-2 w-2 rounded-full bg-white"/>}</span>{c}</label>)}</div><button className={buttonClass} disabled={picked === null} onClick={() => answer(active)}>ส่งคำตอบ</button></>
          : <><p className={`text-sm font-semibold ${answered[active.id] ? 'text-emerald-700' : 'text-red-700'}`}>{answered[active.id] ? 'ถูกต้อง' : `ยังไม่ถูกต้อง · คำตอบคือ: ${active.choices[active.answerIndex]}`}</p>{active.explanation && <p className="text-sm text-slate-600">{active.explanation}</p>}<button className={buttonClass} onClick={resume}>ดูต่อ</button></>}
      </div>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && !done && <p role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><ShieldAlert size={16} className="shrink-0"/>{notice}</p>}
    {!done ? <div className="rounded-xl border border-slate-200 bg-white p-4" aria-label="เงื่อนไขการเรียนจบวิดีโอ">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-slate-800">ดูจริงแล้ว {cover}% <span className="font-normal text-slate-500">· ต้องไม่น้อยกว่า {required}%</span></span>{coverOk ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14}/>ดูครบตามเกณฑ์</span> : <span className="text-xs text-slate-500">นับเฉพาะช่วงที่เล่นจริงตอนอยู่ในหน้านี้</span>}</div>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full transition-all ${coverOk ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${cover}%` }}/><span className="absolute inset-y-0 w-0.5 bg-slate-700" style={{ left: `${required}%` }} aria-hidden/></div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><li>{checkpoints.length > 0 ? `จุดคำถาม ตอบแล้ว ${Object.keys(answered).length}/${checkpoints.length}` : 'ไม่มีจุดคำถามในวิดีโอนี้'}</li><li>ความเร็ว 1x จนกว่าจะเรียนจบ</li><li>กรอข้ามไม่ได้ · สลับแท็บแล้วหยุดอัตโนมัติ</li></ul>
      {ended && !coverOk && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><span className="flex-1">วิดีโอจบแล้ว แต่ดูไม่ครบตามเกณฑ์ ({cover}% จาก {required}%) ย้อนกลับไปดูส่วนที่ยังไม่ได้ดู</span><button className={buttonClass} onClick={jumpToUnwatched}>ไปยังส่วนที่ยังไม่ได้ดู</button></div>}
      {ended && coverOk && unanswered > 0 && <p className="mt-3 text-sm text-amber-800">ยังมีจุดคำถามที่ยังไม่ได้ตอบ {unanswered} ข้อ ย้อนกลับไปดูให้ถึงจุดคำถาม</p>}
    </div> : <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16}/>เรียนบทเรียนนี้จบแล้ว · ดูซ้ำหรือเปลี่ยนความเร็วได้ตามสะดวก</p>}
  </div>;
}
