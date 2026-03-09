import { useState, useEffect, useCallback } from "react";

/**
 * Hook tạo Buffered Form pattern.
 * Giữ state nội bộ để chỉnh sửa, và chỉ cập nhật lên cha khi submit.
 */

//  Quản lý form state với deep copy, sync từ parent, submit callback
export function useForm<T>(
  defaultValue: T,
  propValue?: T,
  onSave?: (data: T) => void
) {
  // 1. Khởi tạo state nội bộ (Deep copy để ngắt tham chiếu)
  const [form, setForm] = useState<T>(() => {
    return propValue ? structuredClone(propValue) : structuredClone(defaultValue);
  });

  // 2. Sync từ Parent xuống (Watcher): Nếu propValue thay đổi, reset form local
  useEffect(() => {
    if (propValue !== undefined) {
      setForm(structuredClone(propValue));
    }
  }, [propValue]);

  // 3. Handle Submit: Đẩy dữ liệu ngược lên Parent
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Ngăn reload trang nếu gắn vào thẻ <form>
    
    if (onSave) {
      // Trả về bản deep copy để đảm bảo tính immutability
      onSave(structuredClone(form));
    }
  }, [form, onSave]);

  // 4. Helper để reset form về trạng thái ban đầu (hoặc trạng thái từ prop)
  const resetForm = useCallback(() => {
    setForm(propValue ? structuredClone(propValue) : structuredClone(defaultValue));
  }, [propValue, defaultValue]);

  return {
    form,
    setForm, // React cần hàm này để bind vào onChange của input
    handleSubmit,
    resetForm
  };
}