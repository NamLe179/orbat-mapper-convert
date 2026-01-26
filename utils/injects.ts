// src/utils/context-utils.ts (Thay thế cho injects.ts)
import { useContext, Context } from "react";

/**
 * Helper để dùng Context an toàn (Tương đương injectStrict của Vue).
 * Nếu component con không được bọc bởi Provider, nó sẽ ném lỗi.
 * * @param context React Context object
 * @param name Tên của Context (để hiển thị lỗi cho dễ debug)
 */
export function useStrictContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  
  if (value === null) {
    throw new Error(`use${name} must be used within a ${name}Provider`);
  }
  
  return value;
}

// Lưu ý: React không có "injectStrictWithSelf" tương đương trực tiếp vì
// props và context trong React luồng dữ liệu rõ ràng hơn Vue.
// Bạn chỉ cần dùng useStrictContext là đủ.