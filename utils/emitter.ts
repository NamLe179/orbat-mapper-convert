import mitt from "mitt";
import type { AppEventMap } from "@/components/eventKeys";

// Tạo và export một instance mitt duy nhất cho toàn bộ ứng dụng
export const emitter = mitt<AppEventMap>();