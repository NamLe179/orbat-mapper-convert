/**
 * Scenario API Service
 * 
 * File này chứa các hàm gọi API đến Backend cho các thao tác CRUD Scenario.
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - FE chỉ giữ state tạm trong memory (Zustand store) và sync với BE
 * 
 * USAGE:
 * 1. Set NEXT_PUBLIC_API_URL trong .env 
 * 2. Thay thế các import từ mockScenarioService bằng scenarioApi
 * 3. Xóa mockScenarios.ts và folder /app/api
 * 4. Implement getAuthHeaders() với token thật
 * 
 * LƯU Ý:
 * - Các API cho Unit/Side/Event/Layer CRUD được định nghĩa trong các file manipulation tương ứng:
 *   + unitManipulations.ts: Unit, Side, SideGroup CRUD
 *   + time.ts: Event CRUD
 *   + geo.ts: Layer, Feature, MapLayer CRUD
 *   + toeManipulations.ts: Equipment, Personnel CRUD
 *   + supplyManipulations.ts: Supply CRUD
 *   + rangeRingManipulations.ts: RangeRing CRUD
 *   + settingsManipulations.ts: CustomSymbol, FillColor CRUD
 *   + unitStateManipulations.ts: UnitState CRUD
 */

import type { Scenario } from "@/types/scenarioModels";
import type { ScenarioMetadata } from "@/scenariostore/localdb";

// ============================================================================
// DEMO SCENARIO CONSTANTS
// ============================================================================

/**
 * Demo scenario IDs - these are sample scenarios provided by the system
 * TODO: Adjust these IDs based on your backend's demo scenarios
 */
export const DEMO_SCENARIO_IDS = {
  FALKLAND82: "demo-falkland82",
  NARVIK40: "demo-narvik40",
  EMPTY: "demo-empty",
} as const;

/**
 * Check if a scenario ID is a demo/sample scenario
 * Demo scenarios might have special handling (read-only, etc.)
 */
export function isDemoScenario(id: string): boolean {
  // TODO: Adjust based on your backend's demo scenario IDs
  return id.startsWith("demo-") || id.startsWith("sample-");
}

// CONFIGURATION

/**
 * Backend API URL 
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * API version 
 */
const API_VERSION = "/api";

/**
 * Full API base URL
 */
const API_BASE = `${BACKEND_URL}${API_VERSION}`;

// AUTHENTICATION HELPERS

/**
 * Get authentication headers for API requests
 * TODO: Implement proper token management (localStorage, cookies, etc.)
 */
function getAuthHeaders(): HeadersInit {
  // Example: Get token from localStorage or auth context
  // const token = localStorage.getItem('auth_token');
  // const token = getAuthToken(); // from your auth service
  
  const token = ""; // TODO: Replace with actual token retrieval
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Handle API response errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      console.error("[API] Unauthorized - token may be expired");
      throw new Error("Unauthorized. Please log in again.");
    }
    
    if (response.status === 403) {
      throw new Error("You do not have permission to perform this action.");
    }
    
    if (response.status === 404) {
      throw new Error("Resource not found.");
    }
    
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
    } catch {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
  }
  
  return response.json();
}

// SCENARIO API SERVICE

export const scenarioApi = {

  // LIST SCENARIOS
  
  /**
   * Lấy danh sách scenario 
   * GET /api/scenarios
   */
  async listScenarios(): Promise<ScenarioMetadata[]> {
    try {
      const response = await fetch(`${API_BASE}/scenarios`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      const data = await handleResponse<any[]>(response);
      
      // Transform response to match ScenarioMetadata format
      return data.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
        created: new Date(s.createdDate || s.created),
        modified: new Date(s.lastModifiedDate || s.modified),
        image: s.image || "",
      }));
    } catch (error) {
      console.error("[ScenarioAPI] Error listing scenarios:", error);
      throw error;
    }
  },

  // LOAD SCENARIO
  
  /**
   * Load scenario theo id
   * GET /api/scenarios/:id
   */
  async loadScenario(id: string): Promise<Scenario | null> {
    try {
      const response = await fetch(`${API_BASE}/scenarios/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (response.status === 404) {
        return null;
      }
      
      return handleResponse<Scenario>(response);
    } catch (error) {
      console.error("[ScenarioAPI] Error loading scenario:", error);
      throw error;
    }
  },

  // CREATE SCENARIO
  
  /**
   * Tạo mới scenario
   * BE sẽ tạo ID và trả về scenario đã được lưu
   * POST /api/scenarios
   * 
   * Request body: Scenario data (không cần id, BE sẽ tạo)
   * Response: { id: string, ...scenario }
   */
  async createScenario(scenario: Omit<Scenario, 'id'> & { id?: string }): Promise<string> {
    try {
      // Gửi scenario data lên BE, BE sẽ tạo ID
      const response = await fetch(`${API_BASE}/scenarios`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(scenario),
      });
      
      const data = await handleResponse<{ id: string }>(response);
      console.log(`[ScenarioAPI] Created scenario: ${data.id}`);
      return data.id; // ID được tạo bởi BE
    } catch (error) {
      console.error("[ScenarioAPI] Error creating scenario:", error);
      throw error;
    }
  },

  // SAVE/UPDATE SCENARIO
  
  /**
   * Save/update scenario
   * BE sẽ cập nhật lastModifiedDate
   * PUT /api/scenarios/:id
   * 
   * Request body: Full scenario data
   * Response: { id: string, ...scenario }
   */
  async saveScenario(scenario: Scenario): Promise<string> {
    try {
      if (!scenario.id) {
        throw new Error("Scenario ID is required for saving");
      }
      
      // Gửi toàn bộ scenario data, BE sẽ xử lý update
      const response = await fetch(`${API_BASE}/scenarios/${scenario.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(scenario),
      });
      
      const data = await handleResponse<{ id: string }>(response);
      console.log(`[ScenarioAPI] Saved scenario: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error("[ScenarioAPI] Error saving scenario:", error);
      throw error;
    }
  },

  // DELETE SCENARIO
  
  /**
   * Delete scenario
   * DELETE /api/scenarios/:id
   */
  async deleteScenario(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/scenarios/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      
      await handleResponse<{ message: string }>(response);
      console.log(`[ScenarioAPI] Deleted scenario: ${id}`);
    } catch (error) {
      console.error("[ScenarioAPI] Error deleting scenario:", error);
      throw error;
    }
  },

  // DUPLICATE SCENARIO
  
  /**
   * Duplicate scenario
   * POST /api/scenarios/:id/duplicate
   */
  async duplicateScenario(id: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/scenarios/${id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      
      const data = await handleResponse<{ id: string }>(response);
      console.log(`[ScenarioAPI] Duplicated scenario ${id} -> ${data.id}`);
      return data.id;
    } catch (error) {
      console.error("[ScenarioAPI] Error duplicating scenario:", error);
      throw error;
    }
  },

  // GET SCENARIO INFO (metadata)
  
  /**
   * Get scenario metadata
   * GET /api/scenarios/:id/info
   */
  async getScenarioInfo(id: string): Promise<ScenarioMetadata | null> {
    try {
      const response = await fetch(`${API_BASE}/scenarios/${id}/info`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (response.status === 404) {
        return null;
      }
      
      const data = await handleResponse<any>(response);
      
      return {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        created: new Date(data.createdDate || data.created),
        modified: new Date(data.lastModifiedDate || data.modified),
        image: data.image || "",
      };
    } catch (error) {
      console.error("[ScenarioAPI] Error getting scenario info:", error);
      throw error;
    }
  },
};


export default scenarioApi;
