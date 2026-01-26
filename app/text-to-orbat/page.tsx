import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenario Editor | MSDL Editor",
  description: "Military Scenario Definition Language Editor",
};

export default function ScenarioEditorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Scenario Editor</h1>
        {/* The actual ScenarioEditor component will be created as a client component */}
        <p className="text-muted-foreground">
          Scenario editor content will be implemented here.
        </p>
      </div>
    </div>
  );
}