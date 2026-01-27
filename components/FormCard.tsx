import React from "react";
import { cn } from "@/lib/utils"; // Giả định utility này đã có sẵn

interface FormCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  description?: React.ReactNode; // Đóng vai trò vừa là prop vừa là slot "description"
  children?: React.ReactNode;
}

export default function FormCard({
  label,
  description,
  children,
  className,
  ...props
}: FormCardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* Cột trái: Tiêu đề và Mô tả */}
        <div className="md:col-span-1">
          <h3 className="text-lg leading-6 font-semibold">{label}</h3>
          
          <div className="text-muted-foreground mt-1 text-sm">
            {/* Logic mô phỏng slot mặc định của Vue: 
                Nếu là string đơn thuần -> bọc trong thẻ <p>
                Nếu là JSX (custom slot content) -> render trực tiếp 
            */}
            {typeof description === "string" ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        </div>

        {/* Cột phải: Nội dung Form */}
        <div className="mt-5 md:col-span-2 md:mt-0">
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}