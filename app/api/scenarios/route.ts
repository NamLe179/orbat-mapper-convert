import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Scenario } from "@/types/scenarioModels";
import { nanoid } from "@/utils";

// Directory where scenarios are stored
const SCENARIOS_DIR = path.join(process.cwd(), "public", "scenarios");

/**
 * GET /api/scenarios
 * List all scenarios in the public/scenarios folder
 */
export async function GET() {
  try {
    const files = await fs.readdir(SCENARIOS_DIR);
    const jsonFiles = files.filter(
      (f) => f.endsWith(".json") && !f.startsWith(".")
    );

    const scenarios = await Promise.all(
      jsonFiles.map(async (filename) => {
        try {
          const filePath = path.join(SCENARIOS_DIR, filename);
          const content = await fs.readFile(filePath, "utf-8");
          const scenario = JSON.parse(content) as Scenario;
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
            filename,
          };
        } catch (e) {
          console.error(`Error reading scenario file ${filename}:`, e);
          return null;
        }
      })
    );

    // Filter out nulls and sort by modified date
    const validScenarios = scenarios
      .filter((s) => s !== null)
      .sort(
        (a, b) =>
          new Date(b!.modified).getTime() - new Date(a!.modified).getTime()
      );

    return NextResponse.json(validScenarios);
  } catch (error) {
    console.error("Error listing scenarios:", error);
    return NextResponse.json(
      { error: "Failed to list scenarios" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scenarios
 * Create a new scenario and save it as a JSON file
 */
export async function POST(request: NextRequest) {
  try {
    const scenario = (await request.json()) as Scenario;

    // Generate ID if not provided
    if (!scenario.id) {
      scenario.id = nanoid();
    }

    // Set meta dates
    const now = new Date().toISOString();
    scenario.meta = {
      ...scenario.meta,
      createdDate: scenario.meta?.createdDate ?? now,
      lastModifiedDate: now,
    };

    // Generate filename from scenario name or ID
    const safeName = (scenario.name || scenario.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
    const filename = `${safeName}-${scenario.id.substring(0, 8)}.json`;
    const filePath = path.join(SCENARIOS_DIR, filename);

    // Ensure directory exists
    await fs.mkdir(SCENARIOS_DIR, { recursive: true });

    // Write scenario to file
    await fs.writeFile(filePath, JSON.stringify(scenario, null, 2), "utf-8");

    console.log(`[API] Created scenario: ${filename}`);

    return NextResponse.json({
      id: scenario.id,
      filename,
      message: "Scenario created successfully",
    });
  } catch (error) {
    console.error("Error creating scenario:", error);
    return NextResponse.json(
      { error: "Failed to create scenario" },
      { status: 500 }
    );
  }
}
