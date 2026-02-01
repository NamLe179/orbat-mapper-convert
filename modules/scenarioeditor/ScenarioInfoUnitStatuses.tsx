"use client";

import React, { useState, useMemo } from "react";
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useScenarioInfoPanelStore } from "@/stores/scenarioInfoPanelStore";

// Types
import type { NUnitStatus } from "@/types/internalModels";

// Components (Giả định đã convert)
import BaseButton from "@/components/BaseButton";
import TableHeader from "@/components/TableHeader";
import DotsMenu from "@/components/DotsMenu";
import InputGroup from "@/components/InputGroup";
import { Button } from "@/components/ui/button";

// Constants
const itemActions = [
  { label: "Edit", action: "edit" },
  { label: "Delete", action: "delete" },
];

export default function ScenarioInfoUnitStatuses() {
  // --- Hooks ---
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const store = useScenarioInfoPanelStore();

  // --- State ---
  const [editedId, setEditedId] = useState<string | null>(null);
  
  // Form State for Inline Edit
  const [form, setForm] = useState<Omit<NUnitStatus, "id">>({
    name: "",
    description: "",
  });

  // Form State for Adding New
  const [addForm, setAddForm] = useState<Omit<NUnitStatus, "id">>({
    name: "",
    description: "",
  });

  // --- Computed (useMemo) ---
  const statuses = useMemo(() => {
    return Object.values(scn.store.state.unitStatusMap);
  }, [scn.store.state.unitStatusMap]);

  // --- Handlers ---

  function startEdit(data: NUnitStatus) {
    setEditedId(data.id);
    const { id, ...rest } = data;
    setForm(rest);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editedId) {
      scn.unitActions.updateUnitStatus(editedId, form);
      setEditedId(null);
    }
  }

  function cancelEdit() {
    setEditedId(null);
  }

  function onAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check if name exists
    if (statuses.find((e) => e.name === addForm.name)) {
      send({
        type: "error",
        message: "Unit status with this name already exists.",
      });
      return;
    }
    
    scn.unitActions.addUnitStatus({ ...addForm });
    setAddForm({ name: "", description: "" });
  }

  function onItemAction(item: NUnitStatus, action: string) {
    switch (action) {
      case "edit":
        startEdit(item);
        break;
      case "delete":
        const success = scn.unitActions.deleteUnitStatus(item.id);
        if (!success) {
          send({
            type: "error",
            message: "Cannot delete unit status that is in use.",
          });
        }
        break;
    }
  }

  return (
    <div className="prose dark:prose-invert max-w-none">
      <TableHeader description="A list of unit statuses is available in this scenario.">
        <Button variant="outline" onClick={() => store.toggleAddEquipment()}>
          {store.showAddEquipment ? "Hide form" : "Add"}
        </Button>
      </TableHeader>

      {/* Add Form */}
      {store.showAddEquipment && (
        <form
          onSubmit={onAddSubmit}
          className="not-prose grid grid-cols-3 gap-2"
        >
          <InputGroup
            autoFocus
            label="Name"
            required
            value={addForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setAddForm({ ...addForm, name: e.target.value })
            }
          />
          <div className="col-span-2 flex items-start gap-3">
            <InputGroup
              className=""
              label="Description"
              value={addForm.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAddForm({ ...addForm, description: e.target.value })
              }
            />
            <BaseButton type="submit" small primary className="self-center">
              +Add
            </BaseButton>
          </div>
        </form>
      )}

      {/* List Table */}
      <form onSubmit={onSubmit}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <tr
                key={status.id}
                onDoubleClick={() => startEdit(status)}
              >
                {status.id === editedId ? (
                  // --- Edit Mode Row ---
                  <>
                    <td>
                      <input
                        type="text"
                        autoFocus
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        className="h-full w-full text-sm bg-transparent border-none focus:ring-0"
                        placeholder="Name"
                      />
                    </td>
                    <td className="" colSpan={3}>
                      <div className="flex">
                        <input
                          type="text"
                          value={form.description || ""}
                          onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                          }
                          className="flex-auto text-sm bg-transparent border-none focus:ring-0"
                          placeholder="Description"
                        />
                        <BaseButton
                          small
                          type="submit"
                          secondary
                          className="ml-2"
                        >
                          Save
                        </BaseButton>
                        <BaseButton
                          small
                          type="button"
                          className="ml-2"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </BaseButton>
                      </div>
                    </td>
                  </>
                ) : (
                  // --- View Mode Row ---
                  <>
                    <td>{status.name}</td>
                    <td>{status.description}</td>
                    <td className="not-prose w-6">
                      <DotsMenu
                        items={itemActions}
                        onAction={(action) => onItemAction(status, action)}
                      />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </form>
    </div>
  );
}