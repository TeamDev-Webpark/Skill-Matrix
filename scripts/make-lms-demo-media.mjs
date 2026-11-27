// สร้างสื่อตัวอย่างของ LMS (วิดีโอ รูป PDF) ลง public/demo-lms ด้วย Chromium ของ Playwright
// รันใหม่เมื่อต้องการแก้เนื้อหา: node scripts/make-lms-demo-media.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('public/demo-lms');
await fs.mkdir(out, { recursive: true });
const font = async name => (await fs.readFile(path.resolve('public/fonts', name))).toString('base64');
const css = `@font-face{font-family:T;font-weight:400;src:url(data:font/ttf;base64,${await font('Sarabun-Regular.ttf')})}
@font-face{font-family:T;font-weight:700;src:url(data:font/ttf;base64,${await font('Sarabun-Bold.ttf')})}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:T,sans-serif;color:#0f172a}`;
const doc = body => `<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`;
const browser = await chromium.launch();

/* ---------- รูปประกอบ: รอยเชื่อมและพื้นที่ทดสอบ ---------- */
const bead = extra => `<svg width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#e2e8f0"/><rect y="150" width="800" height="150" fill="#94a3b8"/>
${Array.from({ length: 26 }, (_, i) => `<ellipse cx="${60 + i * 27}" cy="225" rx="30" ry="46" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>`).join('')}${extra}</svg>`;
const label = text => `<rect x="24" y="24" width="${text.length * 17 + 40}" height="56" rx="12" fill="#1e3a8a"/><text x="44" y="61" font-family="T" font-size="28" font-weight="700" fill="#fff">${text}</text>`;
const images = {
  'weld-good': bead(label('ตัวอย่าง A')),
  'weld-porosity': bead(`${[[250, 215, 11], [290, 240, 7], [315, 205, 9], [345, 232, 13], [385, 214, 6], [405, 244, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1e293b"/>`).join('')}${label('ตัวอย่าง B')}`),
  'weld-undercut': bead(`<path d="M200 180 Q300 150 420 182 Q500 196 600 176" fill="none" stroke="#1e293b" stroke-width="16" stroke-linecap="round"/>${label('ตัวอย่าง C')}`),
  'weld-crack': bead(`<path d="M230 232 l40 -14 l32 18 l48 -26 l38 20 l52 -16 l44 12" fill="none" stroke="#7f1d1d" stroke-width="7"/>${label('ตัวอย่าง D')}`),
  'hv-area': `<svg width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#f8fafc"/>
<rect x="150" y="70" width="500" height="300" fill="#fef3c7" stroke="#d97706" stroke-width="6" stroke-dasharray="22 12"/>
<rect x="330" y="150" width="140" height="130" rx="12" fill="#475569"/><text x="400" y="222" text-anchor="middle" font-family="T" font-size="22" font-weight="700" fill="#fff">ชิ้นทดสอบ</text>
<rect x="40" y="180" width="86" height="90" rx="10" fill="#1d4ed8"/><text x="83" y="230" text-anchor="middle" font-family="T" font-size="19" fill="#fff">โต๊ะควบคุม</text>
<path d="M126 225 H330" stroke="#dc2626" stroke-width="6"/><path d="M470 260 H610 V330" stroke="#16a34a" stroke-width="6" fill="none"/>
<path d="M590 330 h40 m-32 12 h24 m-16 12 h8" stroke="#16a34a" stroke-width="6"/>
<circle cx="150" cy="70" r="18" fill="#dc2626"/><text x="400" y="52" text-anchor="middle" font-family="T" font-size="24" font-weight="700" fill="#92400e">เขตกั้นทดสอบแรงดันสูง · ห้ามเข้าขณะไฟแดงติด</text>
<text x="556" y="404" font-family="T" font-size="19" fill="#166534">สายดิน ต่อก่อนเสมอ</text></svg>`,
};
const shot = await browser.newPage({ viewport: { width: 800, height: 450 } });
for (const [name, svg] of Object.entries(images)) {
  await shot.setContent(doc(svg)); await shot.evaluate(() => document.fonts.ready);
  await shot.screenshot({ path: path.join(out, `${name}.png`) });
}

/* ---------- เอกสาร PDF ---------- */
const table = rows => `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px">${rows.map((r, i) => `<tr>${r.map(c => `<td style="border:1px solid #94a3b8;padding:8px 10px;${i ? '' : 'background:#dbeafe;font-weight:700'}">${c}</td>`).join('')}</tr>`).join('')}</table>`;
const sheet = (title, code, body) => doc(`<div style="padding:4px 8px;font-size:14px;line-height:1.7"><p style="color:#64748b;font-size:12px">เอกสารตัวอย่างสำหรับสาธิตระบบ · ${code}</p><h1 style="font-size:24px;margin:4px 0 14px;border-bottom:3px solid #2563eb;padding-bottom:8px">${title}</h1>${body}</div>`);
const h = text => `<h2 style="font-size:17px;margin:16px 0 6px;color:#1e3a8a">${text}</h2>`;
const list = items => `<ol style="padding-left:22px">${items.map(x => `<li>${x}</li>`).join('')}</ol>`;
const pdfs = {
  'weld-acceptance': sheet('เกณฑ์การยอมรับรอยเชื่อมด้วยสายตา', 'DEMO-QC-WELD-01', `${h('1. ขอบเขต')}<p>ใช้ตรวจรอยเชื่อมโครงสร้างหม้อแปลงหลังเชื่อมเสร็จและก่อนทาสี</p>${h('2. เกณฑ์ยอมรับ')}${table([['ข้อบกพร่อง', 'เกณฑ์ยอมรับ', 'การดำเนินการ'], ['รอยร้าว (Crack)', 'ไม่ยอมรับทุกขนาด', 'แยกชิ้นงานและออก NC'], ['รูพรุน (Porosity)', 'รูไม่เกิน 1 มม. ไม่เกิน 3 รูต่อ 100 มม.', 'เกินเกณฑ์ให้เจียรและเชื่อมซ่อม'], ['รอยแหว่งขอบ (Undercut)', 'ลึกไม่เกิน 0.5 มม.', 'เกินเกณฑ์ให้เชื่อมเติม'], ['สะเก็ดเชื่อม', 'ต้องขจัดออกทั้งหมด', 'ทำความสะอาดก่อนส่งต่อ']])}${h('3. ลำดับการตรวจ')}${list(['เตรียมแสงสว่างอย่างน้อย 500 ลักซ์', 'ทำความสะอาดแนวเชื่อม', 'ตรวจด้วยตาตลอดแนว แล้วใช้เกจวัดจุดที่สงสัย', 'บันทึกผลในแบบฟอร์มตรวจสอบทันที'])}`),
  'weld-checksheet': sheet('แบบบันทึกผลตรวจรอยเชื่อม', 'DEMO-QC-WELD-F01', `<p>หมายเลขชิ้นงาน ................................ ผู้ตรวจ ................................ วันที่ ....................</p>${table([['จุดตรวจ', 'รอยร้าว', 'รูพรุน', 'รอยแหว่ง', 'ผล'], ...['ฐานถังด้านหน้า', 'ฐานถังด้านหลัง', 'หูยกซ้าย', 'หูยกขวา', 'หน้าแปลนท่อ', 'จุดยึดครีบระบาย'].map(x => [x, '', '', '', ''])])}<p style="margin-top:24px">ลงชื่อหัวหน้างาน ................................</p>`),
  'hv-safety': sheet('ขั้นตอนความปลอดภัยการทดสอบแรงดันสูง', 'DEMO-QC-HV-01', `${h('ก่อนทดสอบ')}${list(['กั้นเขตทดสอบและติดป้ายเตือน', 'ตรวจสภาพสายดิน แล้วต่อสายดินก่อนต่อวงจรทุกครั้ง', 'ตรวจว่าไม่มีบุคคลอยู่ในเขตกั้น', 'ให้ผู้ควบคุมการทดสอบตรวจวงจรก่อนจ่ายแรงดัน'])}${h('ระหว่างทดสอบ')}${list(['ขานคำว่า "จ่ายไฟ" ให้ทุกคนได้ยิน', 'เฝ้าดูมิเตอร์และชิ้นทดสอบตลอดเวลา', 'พบเสียงหรือแสงผิดปกติ ให้กดหยุดฉุกเฉินทันที'])}${h('หลังทดสอบ')}${list(['ลดแรงดันเป็นศูนย์และตัดแหล่งจ่าย', 'คายประจุด้วยไม้คายประจุที่ต่อสายดินแล้ว', 'บันทึกผลและปลดป้ายเตือน'])}${table([['ระดับแรงดันทดสอบ', 'ระยะกั้นขั้นต่ำ'], ['ไม่เกิน 10 kV', '1.0 เมตร'], ['10–50 kV', '2.0 เมตร'], ['เกิน 50 kV', '3.0 เมตร']])}`),
};
const printer = await browser.newPage();
for (const [name, html] of Object.entries(pdfs)) {
  await printer.setContent(html); await printer.evaluate(() => document.fonts.ready);
  await printer.pdf({ path: path.join(out, `${name}.pdf`), format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } });
}

/* ---------- วิดีโอสไลด์ ---------- */
const videos = {
  'weld-inspection': { seconds: 8, slides: [
    ['การตรวจรอยเชื่อมด้วยสายตา', ['วิดีโอตัวอย่างสำหรับสาธิตระบบเรียนออนไลน์']],
    ['เตรียมก่อนตรวจ', ['แสงสว่างอย่างน้อย 500 ลักซ์', 'ทำความสะอาดแนวเชื่อม', 'เตรียมเกจวัดรอยเชื่อม']],
    ['ข้อบกพร่องที่พบบ่อย', ['รอยร้าว: ไม่ยอมรับทุกขนาด', 'รูพรุน: นับจำนวนและวัดขนาด', 'รอยแหว่งขอบ: วัดความลึก']],
    ['พบของเสียต้องทำอย่างไร', ['หยุดและแยกชิ้นงาน', 'ติดป้ายชี้บ่ง', 'บันทึกและแจ้งหัวหน้างาน']],
  ] },
  'hv-safety': { seconds: 8, slides: [
    ['ความปลอดภัยการทดสอบแรงดันสูง', ['วิดีโอตัวอย่างสำหรับสาธิตระบบเรียนออนไลน์']],
    ['ก่อนจ่ายแรงดัน', ['กั้นเขตและติดป้ายเตือน', 'ต่อสายดินก่อนต่อวงจร', 'ผู้ควบคุมตรวจวงจร']],
    ['ระหว่างทดสอบ', ['ขานก่อนจ่ายไฟ', 'ห้ามเข้าเขตกั้น', 'ผิดปกติให้กดหยุดฉุกเฉิน']],
    ['หลังทดสอบ', ['ลดแรงดันเป็นศูนย์', 'คายประจุก่อนสัมผัส', 'บันทึกผลทันที']],
  ] },
};
for (const [name, video] of Object.entries(videos)) {
  const total = video.slides.length * video.seconds;
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: out, size: { width: 960, height: 540 } } });
  const page = await context.newPage();
  await page.setContent(doc(`<div id="s" style="width:960px;height:540px;background:#1e3a8a;color:#fff;padding:56px 70px;position:relative"></div><script>
    const slides=${JSON.stringify(video.slides)},per=${video.seconds},total=${total},start=performance.now(),s=document.getElementById('s');
    function draw(){const t=Math.min(total,(performance.now()-start)/1000),i=Math.min(slides.length-1,Math.floor(t/per)),[title,items]=slides[i],k=t-i*per;
      s.innerHTML='<p style="font-size:20px;color:#bfdbfe">ตอนที่ '+(i+1)+' จาก '+slides.length+'</p><h1 style="font-size:44px;line-height:1.35;margin:10px 0 28px">'+title+'</h1>'
        +items.map((x,n)=>'<p style="font-size:30px;line-height:2;opacity:'+(k>0.6+n*1.4?1:0.12)+'">• '+x+'</p>').join('')
        +'<div style="position:absolute;left:0;bottom:0;height:12px;background:#fff;width:'+(t/total*960)+'px"></div><p style="position:absolute;right:28px;bottom:26px;font-size:18px;color:#bfdbfe">'+Math.floor(t)+' / '+total+' วินาที</p>';
      requestAnimationFrame(draw)}
    draw();</script>`));
  await page.waitForTimeout(total * 1000 + 600);
  const recording = page.video();
  await context.close();
  await fs.rename(await recording.path(), path.join(out, `${name}.webm`));
}
await browser.close();
for (const file of await fs.readdir(out)) console.log(file, Math.round((await fs.stat(path.join(out, file))).size / 1024), 'KB');
