/** ตรรกะล้วนของเนื้อหาบทเรียน: แปลงบทความเป็นบล็อก และนำเข้าข้อสอบจากข้อความ */
import { emptyQuestion, uid } from './lmsCore';
import type { Question } from './lmsCore';

export type Block =
  | { type: 'heading' | 'paragraph' | 'callout'; text: string }
  | { type: 'bullets'; items: string[] } | { type: 'numbers'; items: string[] }
  | { type: 'image'; src: string; caption: string };

const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
export const safeImageSrc = (src: string) => /^(idb:|https?:\/\/|\/(?!\/))/i.test(src);

export function parseArticle(text: string): Block[] {
  const blocks: Block[] = [];
  const push = (type: 'bullets' | 'numbers', value: string) => {
    const last = blocks[blocks.length - 1];
    if (last && (last.type === 'bullets' || last.type === 'numbers') && last.type === type) last.items.push(value);
    else blocks.push(type === 'bullets' ? { type: 'bullets', items: [value] } : { type: 'numbers', items: [value] });
  };
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const image = line.match(IMAGE);
    if (image) blocks.push({ type: 'image', caption: image[1], src: image[2] });
    else if (line.startsWith('## ')) blocks.push({ type: 'heading', text: line.slice(3) });
    else if (line.startsWith('> ')) blocks.push({ type: 'callout', text: line.slice(2) });
    else if (line.startsWith('- ')) push('bullets', line.slice(2));
    else if (/^\d+\.\s/.test(line)) push('numbers', line.replace(/^\d+\.\s*/, ''));
    else blocks.push({ type: 'paragraph', text: line });
  }
  return blocks;
}
/** รูปที่แทรกในบทความ (ใช้ตอนเก็บกวาดไฟล์ ไม่ให้ลบรูปที่ยังใช้อยู่) */
export const articleImages = (text: string) => parseArticle(text).flatMap(b => b.type === 'image' ? [b.src] : []);

/**
 * นำเข้าข้อสอบหลายข้อจากข้อความ คั่นแต่ละข้อด้วยบรรทัดว่าง
 *   คำถาม
 *   a) ตัวเลือก
 *   *b) ตัวเลือกที่ถูก          (มี * นำหน้าหลายข้อ = เลือกได้หลายคำตอบ)
 *   ตอบ: คำตอบ | คำตอบอื่น      (ใช้แทนตัวเลือกสำหรับคำตอบสั้น)
 *   อธิบาย: ...   คะแนน: 2
 */
export function parseQuestionText(text: string): { questions: Question[]; errors: string[] } {
  const questions: Question[] = []; const errors: string[] = [];
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
  blocks.forEach((lines, index) => {
    const n = index + 1;
    const title = lines[0].replace(/^(ข้อ\s*)?\d+\s*[.)]\s*/, '').trim();
    const choices: string[] = []; const correct: number[] = []; let accepted: string[] = []; let explanation = ''; let points = 1;
    for (const line of lines.slice(1)) {
      const answer = line.match(/^ตอบ\s*[:：]\s*(.+)$/); const why = line.match(/^อธิบาย\s*[:：]\s*(.+)$/); const score = line.match(/^คะแนน\s*[:：]\s*([\d.]+)$/);
      if (answer) accepted = answer[1].split('|').map(x => x.trim()).filter(Boolean);
      else if (why) explanation = why[1];
      else if (score) points = Number(score[1]);
      else {
        const choice = line.match(/^(\*)?\s*(?:[-•]|[a-hA-Hก-ฮ]\s*[.)])\s*(\*)?\s*(.+)$/) ?? line.match(/^(\*)()\s*(.+)$/);
        if (!choice) { errors.push(`ข้อ ${n}: อ่านบรรทัด "${line}" ไม่ได้`); return; }
        if (choice[1] || choice[2]) correct.push(choices.length);
        choices.push(choice[3].trim());
      }
    }
    if (!title) return void errors.push(`ข้อ ${n}: ไม่มีคำถาม`);
    if (!(points > 0 && points <= 100)) return void errors.push(`ข้อ ${n}: คะแนนต้องมากกว่า 0 และไม่เกิน 100`);
    const base = { text: title, explanation, points };
    if (accepted.length && !choices.length) return void questions.push({ ...emptyQuestion('short'), ...base, accepted });
    if (choices.length < 2) return void errors.push(`ข้อ ${n}: ต้องมีอย่างน้อย 2 ตัวเลือก หรือบรรทัด "ตอบ:"`);
    if (!correct.length) return void errors.push(`ข้อ ${n}: ใส่ * หน้าตัวเลือกที่ถูก`);
    const trueFalse = choices.length === 2 && choices[0] === 'ถูก' && choices[1] === 'ผิด' && correct.length === 1;
    const type = trueFalse ? 'truefalse' : correct.length > 1 ? 'multiple' : 'single';
    questions.push({ ...emptyQuestion(type), ...base, id: uid('Q'), choices, correct });
  });
  return { questions, errors };
}
