// src/utils/dom.ts

// Kiểm tra môi trường Client
export const isClient = typeof window !== "undefined";

export function sanitizeHTML(str: string) {
  if (!isClient) return str; // Trả về nguyên gốc nếu chạy ở server
  
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

export async function toDom(xmlString: string) {
  // Ưu tiên dùng Native DOMParser ở Client để nhẹ hơn
  if (isClient) {
    return new DOMParser().parseFromString(xmlString, "text/xml");
  }

  // Fallback dùng thư viện khi chạy ở môi trường khác (nếu cần)
  // Đảm bảo bạn đã cài: pnpm add @xmldom/xmldom
  const xmldom = await import("@xmldom/xmldom");
  return new xmldom.DOMParser().parseFromString(xmlString, "text/xml");
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  } else if (typeof e === "string") {
    return e;
  } else {
    return "Unknown error";
  }
}

export function triggerPostMoveFlash(element: Element | null) {
  if (!element || !element.animate) return;

  element.animate(
    [
      {
        backgroundColor: "#4a600c", // Màu xanh quân sự
      },
      {},
    ],
    {
      duration: 1500,
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",
      iterations: 1,
    },
  );
}