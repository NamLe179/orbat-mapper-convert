"use client";

import React, { useState, useMemo } from "react";
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useScenarioInfoPanelStore } from "@/stores/scenarioInfoPanelStore";

// Types
import type { NRangeRingGroup } from "@/types/internalModels";

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

export default function ScenarioInfoGroups() {
  // --- Hooks ---
  const scn = useActiveScenario();
  const store = useScenarioInfoPanelStore();
  const { send } = useNotifications();

  // --- State ---
  const [editedId, setEditedId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<NRangeRingGroup, "id">>({ name: "" });
  const [addForm, setAddForm] = useState<Omit<NRangeRingGroup, "id">>({ name: "" });

  // --- Computed (useMemo) ---
  // scn.store.state.rangeRingGroupMap cần phải reactive (được wrap bởi hook hoặc proxy)
  const groups = useMemo(() => {
    return Object.values(scn.store.state.rangeRingGroupMap);
  }, [scn.store.state.rangeRingGroupMap]);

  // --- Handlers ---

  function startEdit(data: NRangeRingGroup) {
    setEditedId(data.id);
    const { id, ...rest } = data;
    setForm(rest);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editedId) {
      scn.unitActions.updateRangeRingGroup(editedId, form);
      setEditedId(null);
    }
  }

  function cancelEdit() {
    setEditedId(null);
  }

  function onItemAction(item: NRangeRingGroup, action: string) {
    switch (action) {
      case "edit":
        startEdit(item);
        break;
      case "delete":
        const success = scn.unitActions.deleteRangeRingGroup(item.id);
        if (!success) {
          send({
            type: "error",
            message: "Cannot delete a group that is in use.",
          });
        }
        break;
    }
  }

  function onAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    // check if name exists
    if (groups.find((e) => e.name === addForm.name)) {
      send({
        type: "error",
        message: "A group with this name already exists.",
      });
      return;
    }
    scn.unitActions.addRangeRingGroup({ ...addForm });
    setAddForm({ name: "" });
  }

  return (
    <div className="prose dark:prose-invert max-w-none">
      <TableHeader description="Range ring groups available in this scenario.">
        <Button variant="outline" onClick={() => store.toggleAddGroup()}>
          {store.showAddGroup ? "Hide form" : "Add"}
        </Button>
      </TableHeader>

      {/* Add Form */}
      {store.showAddGroup && (
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
              <td></td>
            </tr>
          </thead>
          <tbody>
            {groups.map((eq) => (
              <tr
                key={eq.id}
                onDoubleClick={() => startEdit(eq)}
                className="cursor-pointer"
              >
                {eq.id === editedId ? (
                  // Edit Mode Row
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
                    <td colSpan={3}>
                      <div className="flex">
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
                  // Display Mode Row
                  <>
                    <td>{eq.name}</td>
                    <td className="not-prose w-6">
                      <DotsMenu
                        items={itemActions}
                        onAction={(action) => onItemAction(eq, action)}
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