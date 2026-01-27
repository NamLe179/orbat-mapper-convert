import React from "react";
import { Button } from "@/components/ui/button";

// Kế thừa tất cả props của Button gốc (shadcn/ui) và thêm các flags tùy chỉnh
interface BaseButtonProps extends React.ComponentProps<typeof Button> {
  primary?: boolean;
  secondary?: boolean;
  small?: boolean;
  large?: boolean;
  huge?: boolean;
}

export default function BaseButton({
  primary,
  secondary,
  small,
  large,
  huge,
  children,
  className,
  ...props
}: BaseButtonProps) {
  // Tính toán variant dựa trên flags
  // Logic Vue: primary -> default, secondary -> secondary, còn lại -> outline
  const computedVariant = primary
    ? "default"
    : secondary
    ? "secondary"
    : "outline";

  // Tính toán size dựa trên flags
  // Logic Vue: small -> sm, large/huge -> lg, còn lại -> default (undefined)
  const computedSize = small
    ? "sm"
    : large || huge
    ? "lg"
    : "default";

  return (
    <Button
      variant={computedVariant}
      size={computedSize}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}