import { type WorkBook } from "xlsx";

export type SpreadsheetDialect = "ODIN_DRAGON" | "unknown";

export function detectSpreadsheetDialect(wb: WorkBook): SpreadsheetDialect {
  const sheetNames = wb.SheetNames;
  
  // Logic kiểm tra xem sheet đầu tiên có phải là "UNIT INFO" hay không
  // Đây là đặc điểm nhận dạng của format ODIN/DRAGON
  if (sheetNames[0] === "UNIT INFO") {
    return "ODIN_DRAGON";
  }

  return "unknown";
}