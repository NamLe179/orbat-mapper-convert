import React from "react";
import { Input } from "@/components/ui/input";

// Mở rộng props chuẩn của Input HTML, nhưng định nghĩa lại 'value'
interface TextAmpInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value?: string | number;
}

export default function TextAmpInput({ value, ...props }: TextAmpInputProps) {
  return (
    <Input
      type="text"
      // React Input yêu cầu value không được là null/undefined nếu là controlled component
      // fallback về "" để tránh lỗi "changing uncontrolled input to controlled"
      value={value ?? ""}
      {...props}
    />
  );
}