import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pagination } from './Pagination';

export interface PagedView<T> {
  /** รายการเฉพาะหน้าปัจจุบัน (ใช้กับรายการการ์ด) */
  rows: T[];
  /** class สำหรับซ่อนรายการนอกหน้าปัจจุบันบนจอ แต่ยังพิมพ์ออกครบ (ใช้กับตาราง/รายงาน) */
  off: (index: number, printAs?: 'row' | 'block') => string;
  /** แถบแบ่งหน้า เป็น null เมื่อรายการไม่เกินหนึ่งหน้า */
  bar: ReactNode;
}

/** ตัวแบ่งหน้ากลางของระบบ ทุกตารางและรายการใช้แถบเดียวกัน */
export function Paged<T>({ items, children, resetKey = '', size = 10, sizes = [5, 10, 25, 50], unit = 'รายการ', boxed = false, className = '' }: {
  items: T[]; children: (view: PagedView<T>) => ReactNode;
  /** เปลี่ยนค่าเมื่อไร (เช่น ตัวกรอง) กลับไปหน้า 1 */
  resetKey?: string; size?: number; sizes?: number[]; unit?: string;
  /** true เมื่อแถบอยู่เดี่ยวๆ ใต้รายการการ์ด จึงต้องมีกรอบของตัวเอง */
  boxed?: boolean; className?: string;
}) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const [pageSize, setPageSize] = useState(size);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(state.key === resetKey ? state.page : 1, totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const off: PagedView<T>['off'] = (index, printAs = 'row') => index >= start && index < end ? '' : printAs === 'row' ? 'hidden print:table-row' : 'hidden print:block';
  const bar = items.length <= size ? null : <Pagination currentPage={page} totalItems={items.length} pageSize={pageSize} pageSizeOptions={sizes} itemLabel={unit}
    onPageChange={next => setState({ key: resetKey, page: next })} onPageSizeChange={setPageSize}
    className={`${boxed ? 'rounded-xl border' : ''} ${className}`}/>;
  return <>{children({ rows: items.slice(start, end), off, bar })}</>;
}
