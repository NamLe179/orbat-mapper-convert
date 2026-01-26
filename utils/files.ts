// src/utils/files.ts

export function stripFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

export async function saveBlobToLocalFile(
  data: Blob | Promise<Blob> | Response,
  fileName: string,
  options: { mimeTypes?: string[]; extensions?: string[] } = {},
) {
  // Chỉ chạy ở client
  if (typeof window === "undefined") return;

  // Dynamic import để tránh lỗi SSR
  const { fileSave } = await import("browser-fs-access");
  
  try {
    return await fileSave(data, { fileName, ...options });
  } catch (error: any) {
    // Xử lý lỗi Abort (người dùng hủy lưu)
    if (error.name === "AbortError") {
      return;
    } else {
      throw error;
    }
  }
}