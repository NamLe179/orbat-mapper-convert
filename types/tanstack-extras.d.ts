import "@tanstack/react-table"; // Đổi từ vue-table sang react-table
import { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    // Giữ nguyên thuộc tính align nếu bạn muốn dùng logic align cũ
    align?: "left" | "center" | "right";
    
    // GỢI Ý THÊM: Vì bạn dùng Tailwind, nên thêm className để tùy biến style từng cột dễ hơn
    className?: string; 
    
    // GỢI Ý THÊM: Header class
    headerClassName?: string;
  }
}