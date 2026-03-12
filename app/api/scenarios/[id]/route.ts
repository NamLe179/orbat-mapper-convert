import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Scenario } from "@/types/scenarioModels";

// Directory where scenarios are stored
const SCENARIOS_DIR = path.join(process.cwd(), "public", "scenarios");

// Map of scenario IDs to filenames (for quick lookup)
async function findScenarioFile(
  scenarioId: string
): Promise<{ filePath: string; filename: string } | null> {
  try {
    const files = await fs.readdir(SCENARIOS_DIR);
    const jsonFiles = files.filter(
      (f) => f.endsWith(".json") && !f.startsWith(".")
    );

    for (const filename of jsonFiles) {
      const filePath = path.join(SCENARIOS_DIR, filename);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const scenario = JSON.parse(content) as Scenario;
        if (scenario.id === scenarioId) {
          return { filePath, filename };
        }
      } catch (e) {
        // Skip invalid files
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("Error finding scenario file:", error);
    return null;
  }
}

/**
 * GET /api/scenarios/[id]
 * Get a specific scenario by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const fileInfo = await findScenarioFile(id);

    if (!fileInfo) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    const content = await fs.readFile(fileInfo.filePath, "utf-8");
    const scenario = JSON.parse(content);

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("Error reading scenario:", error);
    return NextResponse.json(
      { error: "Failed to read scenario" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scenarios/[id]
 * Update an existing scenario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scenario = (await request.json()) as Scenario;

    // Ensure ID matches
    scenario.id = id;

    // Update modified date
    const now = new Date().toISOString();
    scenario.meta = {
      createdDate: scenario.meta?.createdDate ?? now,
      lastModifiedDate: now,
      exportedFrom: scenario.meta?.exportedFrom,
      exportedDate: scenario.meta?.exportedDate,
    };

    // Find existing file or create new one
    let fileInfo = await findScenarioFile(id);
    let filePath: string;
    let filename: string;

    if (fileInfo) {
      // Update existing file
      filePath = fileInfo.filePath;
      filename = fileInfo.filename;
    } else {
      // Create new file
      const safeName = (scenario.name || scenario.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);
      filename = `${safeName}-${scenario.id.substring(0, 8)}.json`;
      filePath = path.join(SCENARIOS_DIR, filename);
    }

    // Ensure directory exists
    await fs.mkdir(SCENARIOS_DIR, { recursive: true });

    // Write scenario to file
    await fs.writeFile(filePath, JSON.stringify(scenario, null, 2), "utf-8");

    console.log(`[API] Updated scenario: ${filename}`);

    return NextResponse.json({
      id: scenario.id,
      filename,
      message: "Scenario updated successfully",
    });
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scenarios/[id]
 * Delete a scenario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Don't allow deleting demo scenarios
    if (id.startsWith("demo-")) {
      return NextResponse.json(
        { error: "Cannot delete demo scenarios" },
        { status: 403 }
      );
    }

    const fileInfo = await findScenarioFile(id);

    if (!fileInfo) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    // Delete the file
    await fs.unlink(fileInfo.filePath);

    console.log(`[API] Deleted scenario: ${fileInfo.filename}`);

    return NextResponse.json({
      message: "Scenario deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 }
    );
  }
}
