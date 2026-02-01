import { useState, useEffect } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Kiểm tra xem window có tồn tại không (để tránh lỗi SSR trong Next.js)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      
      // Cập nhật state ban đầu
      if (media.matches !== matches) {
        setMatches(media.matches);
      }

      // Lắng nghe sự thay đổi
      const listener = () => setMatches(media.matches);
      media.addEventListener("change", listener);
      
      return () => media.removeEventListener("change", listener);
    }
  }, [matches, query]);

  return matches;
}