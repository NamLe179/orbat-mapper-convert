/**
 * Scenario Service (Mock Implementation)
 * 
 * This file provides scenario CRUD operations using the local Next.js API routes.
 * Scenarios are stored as JSON files in the public/scenarios folder.
 * 
 * Available demo scenarios:
 * - falkland82: The Falklands War 1982
 * - narvik40: Battles of Narvik 1940
 * - empty: An empty scenario template
 * 
 * Current Local API Endpoints:
 * - GET    /api/scenarios          - List all scenarios
 * - GET    /api/scenarios/:id      - Get a specific scenario
 * - POST   /api/scenarios          - Create a new scenario
 * - PUT    /api/scenarios/:id      - Update a scenario
 * - DELETE /api/scenarios/:id      - Delete a scenario
 * 
 * 
 */

import type { Scenario } from "@/types/scenarioModels";
import type { ScenarioMetadata } from "@/scenariostore/localdb";
import { nanoid } from "@/utils";
import { createEmptyScenario } from "@/scenariostore/io";

// Demo scenario IDs
export const DEMO_SCENARIO_IDS = {
  FALKLAND82: "demo-falkland82",
  NARVIK40: "demo-narvik40",
  EMPTY: "demo-empty",
} as const;

// Demo scenario URLs for loading from public folder
const DEMO_SCENARIO_URLS: Record<string, string> = {
  "demo-falkland82": "/scenarios/falkland82.json",
  falkland82: "/scenarios/falkland82.json",
  falklands82: "/scenarios/falkland82.json",
  "demo-narvik40": "/scenarios/narvik40.json",
  narvik40: "/scenarios/narvik40.json",
  "demo-empty": "/scenarios/empty.json",
  empty: "/scenarios/empty.json",
};

/**
 * Check if a scenario ID is a demo scenario
 */
export function isDemoScenario(id: string): boolean {
  return id.startsWith("demo-") || id in DEMO_SCENARIO_URLS;
}

/**
 * Create an empty scenario with default settings
 */
export function createEmptyMockScenario(options: {
  id?: string;
  name?: string;
  description?: string;
} = {}): Scenario {
  const emptyScenario = createEmptyScenario({
    id: options.id ?? DEMO_SCENARIO_IDS.EMPTY,
  });
  
  return {
    ...emptyScenario,
    name: options.name ?? "Empty Scenario",
    description: options.description ?? "An empty scenario for testing and development",
  };
}

/**
 * Load a demo scenario from the public folder
 */
export async function loadDemoScenarioFromUrl(scenarioId: string): Promise<Scenario | null> {
  // Handle demo- prefix
  const lookupId = scenarioId.startsWith("demo-") 
    ? scenarioId 
    : `demo-${scenarioId}`;
  
  // Get URL for demo scenario
  const url = DEMO_SCENARIO_URLS[lookupId] ?? DEMO_SCENARIO_URLS[scenarioId];
  
  if (!url) {
    console.warn(`[MockScenarios] Unknown demo scenario ID: ${scenarioId}`);
    return null;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch scenario: ${response.statusText}`);
    }
    const data = await response.json();
    return data as Scenario;
  } catch (error) {
    console.error(`[MockScenarios] Error loading demo scenario:`, error);
    return null;
  }
}

/**
 * Scenario service that provides CRUD operations
 * Uses the local API to save scenarios as JSON files in public/scenarios
 */
export const mockScenarioService = {
  /**
   * List all scenarios (metadata only)
   */
  async listScenarios(): Promise<ScenarioMetadata[]> {
    try {
      const response = await fetch('/api/scenarios');
      if (!response.ok) {
        throw new Error('Failed to fetch scenarios');
      }
      const data = await response.json();
      // Convert date strings to Date objects
      return data.map((s: any) => ({
        ...s,
        created: new Date(s.created),
        modified: new Date(s.modified),
      }));
    } catch (error) {
      console.error('[ScenarioService] Error listing scenarios:', error);
      // Fallback to demo scenarios only
      return [
        {
          id: DEMO_SCENARIO_IDS.FALKLAND82,
          name: "The Falklands War 1982",
          description: "The Falklands War was a military conflict between Argentina and the United Kingdom in 1982.",
          created: new Date("2024-01-01"),
          modified: new Date("2024-12-09"),
          image: "https://upload.wikimedia.org/wikipedia/commons/8/8b/HMS_Broadsword_and_Hermes%2C_1982_%28IWM%29.jpg",
        },
        {
          id: DEMO_SCENARIO_IDS.NARVIK40,
          name: "Battles of Narvik 1940",
          description: "A series of naval and land engagements fought between German and Allied forces from April to June 1940.",
          created: new Date("2024-04-01"),
          modified: new Date("2024-12-09"),
          image: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Norwegian_Army_Colt_heavy_machine_gun_at_the_Narvik_front.jpg",
        },
        {
          id: DEMO_SCENARIO_IDS.EMPTY,
          name: "Empty Scenario",
          description: "An empty scenario template for testing",
          created: new Date(),
          modified: new Date(),
          image: "",
        },
      ];
    }
  },

  /**
   * Load a scenario by ID
   */
  async loadScenario(id: string): Promise<Scenario | null> {
    // For demo scenarios, load from public folder directly
    if (isDemoScenario(id)) {
      return loadDemoScenarioFromUrl(id);
    }

    try {
      const response = await fetch(`/api/scenarios/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch scenario');
      }
      return await response.json();
    } catch (error) {
      console.error('[ScenarioService] Error loading scenario:', error);
      return null;
    }
  },

  /**
   * Save a scenario (create or update)
   * This saves the scenario as a JSON file in public/scenarios
   */
  async saveScenario(scenario: Scenario): Promise<string> {
    const id = scenario.id ?? nanoid();
    const scenarioToSave = { ...scenario, id };
    
    try {
      const response = await fetch(`/api/scenarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenarioToSave),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save scenario');
      }
      
      const data = await response.json();
      console.log(`[ScenarioService] Scenario saved to file: ${data.filename}`);
      return data.id;
    } catch (error) {
      console.error('[ScenarioService] Error saving scenario:', error);
      throw error;
    }
  },

  /**
   * Create a new scenario
   * This creates a new JSON file in public/scenarios
   */
  async createScenario(scenario: Scenario): Promise<string> {
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create scenario');
      }
      
      const data = await response.json();
      console.log(`[ScenarioService] Scenario created: ${data.filename}`);
      return data.id;
    } catch (error) {
      console.error('[ScenarioService] Error creating scenario:', error);
      throw error;
    }
  },

  /**
   * Delete a scenario
   */
  async deleteScenario(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/scenarios/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete scenario');
      }
      
      console.log(`[ScenarioService] Scenario deleted: ${id}`);
    } catch (error) {
      console.error('[ScenarioService] Error deleting scenario:', error);
      throw error;
    }
  },

  /**
   * Duplicate a scenario
   */
  async duplicateScenario(id: string): Promise<string | null> {
    const scenario = await this.loadScenario(id);
    if (!scenario) return null;
    
    const newId = nanoid();
    const duplicatedScenario: Scenario = {
      ...scenario,
      id: newId,
      name: `${scenario.name} (copy)`,
      meta: {
        createdDate: new Date().toISOString(),
        lastModifiedDate: new Date().toISOString(),
      },
    };
    
    await this.saveScenario(duplicatedScenario);
    console.log(`[ScenarioService] Scenario duplicated: ${id} -> ${newId}`);
    
    return newId;
  },

  /**
   * Get scenario metadata by ID
   */
  async getScenarioInfo(id: string): Promise<ScenarioMetadata | null> {
    // Load the scenario and extract metadata
    const scenario = await this.loadScenario(id);
    if (!scenario) return null;
    
    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description ?? "",
      created: scenario.meta?.createdDate 
        ? new Date(scenario.meta.createdDate) 
        : new Date(),
      modified: scenario.meta?.lastModifiedDate 
        ? new Date(scenario.meta.lastModifiedDate) 
        : new Date(),
      image: "",
    };
  },
};

export default mockScenarioService;