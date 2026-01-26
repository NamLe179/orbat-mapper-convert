"use client";

import { useCallback } from "react";
import type { TScenario } from "@/scenariostore";
import { type Scenario } from "@/types/scenarioModels";

export function useScenarioShare() {
  /**
   * Nén Scenario data thành chuỗi Base64 và tạo URL chia sẻ.
   */
  const shareScenario = useCallback(async (scenario: TScenario) => {
    // Dynamic import để giảm bundle size ban đầu
    const { strFromU8, strToU8, zlibSync } = await import("fflate");
    
    // Serialize data
    const scenarioData = scenario.io.serializeToObject();
    const jsonString = JSON.stringify(scenarioData);
    
    // Nén dữ liệu (Level 9 - nén cao nhất)
    const compressed = zlibSync(strToU8(jsonString), { level: 9 });
    
    // Chuyển sang Base64
    // binary string -> base64
    const base64 = btoa(strFromU8(compressed, true));
    
    // Tạo URL
    // Lưu ý: window chỉ tồn tại ở Client-side
    const url = new URL(window.location.href);
    url.pathname = "/import";
    url.hash = "";
    url.searchParams.set("data", base64);
    
    const urlStr = url.toString();
    const result = { url: urlStr, warning: "" };
    
    // Cảnh báo nếu URL quá dài
    if (urlStr.length > 2048) {
      result.warning = `The generated URL is very long (${urlStr.length} chars). It might not work in some browsers or chat apps.`;
    }
    
    return result;
  }, []);

  /**
   * Giải nén Scenario data từ URL parameter.
   */
  const loadScenarioFromUrlParam = useCallback(async (param: string): Promise<Scenario> => {
    const { strFromU8, strToU8, unzlibSync } = await import("fflate");
    
    // Base64 -> Binary String -> Uint8Array
    const compressed = strToU8(atob(param), true);
    
    // Giải nén
    const decompressed = unzlibSync(compressed);
    
    // Parse JSON
    const jsonString = strFromU8(decompressed);
    return JSON.parse(jsonString) as Scenario;
  }, []);

  return {
    shareScenario,
    loadScenarioFromUrlParam,
  };
}