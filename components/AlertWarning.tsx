import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AlertWarningProps {
  // Prop title có giá trị mặc định
  title?: string;
  // Slot mặc định chuyển thành children
  children?: React.ReactNode;
}

export default function AlertWarning({
  title = "Attention needed",
  children,
}: AlertWarningProps) {
  return (
    <Alert>
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {children}
      </AlertDescription>
    </Alert>
  );
}