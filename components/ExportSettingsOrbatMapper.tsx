"use client";

import React, { useMemo, useEffect } from "react";
import { type OrbatMapperExportSettings } from "@/types/importExport";
import { useActiveScenario } from "@/components/injects";
import InputCheckbox from "@/components/InputCheckbox";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import InputGroup from "@/components/InputGroup";

interface ExportSettingsOrbatMapperProps {
  // Controlled form state
  form: OrbatMapperExportSettings;
  onFormChange: (settings: OrbatMapperExportSettings) => void;
}

export default function ExportSettingsOrbatMapper({
  form,
  onFormChange,
}: ExportSettingsOrbatMapperProps) {
  
  // Access Store
  const { store } = useActiveScenario();
  const state = store.state;

  // --- Initialization (useEffect) ---
  // Tương đương logic: form.value.scenarioName = state.info.name;
  useEffect(() => {
    // Chỉ set nếu chưa có tên hoặc muốn override khi mount
    if (state.info.name && form.scenarioName !== state.info.name) {
      onFormChange({
        ...form,
        scenarioName: state.info.name,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chạy 1 lần khi mount

  // --- Computed (useMemo) ---
  const sides = useMemo(() => {
    return state.sides.map((id) => state.sideMap[id]);
  }, [state.sides, state.sideMap]);

  // --- Helpers Update Form ---
  const updateForm = (key: keyof OrbatMapperExportSettings, value: any) => {
    onFormChange({ ...form, [key]: value });
  };

  // --- Handlers ---
  
  // Logic toggle toàn bộ Groups của 1 Side
  const toggleSide = (sideId: string) => {
    const groups = state.sideMap[sideId].groups;
    const currentSelected = form.sideGroups;
    
    // Kiểm tra xem có group nào của side này đang được chọn không
    const hasAnySelected = form.sideGroups.some((g) => groups.includes(g));

    let newSelectedGroups: string[];

    if (hasAnySelected) {
      // Vue logic: form.value.sideGroups.filter(...) -> Nếu đã chọn thì bỏ chọn hết
      newSelectedGroups = currentSelected.filter((g) => !groups.includes(g));
    } else {
      // Nếu chưa chọn thì chọn hết
      newSelectedGroups = [...currentSelected, ...groups];
    }

    updateForm("sideGroups", newSelectedGroups);
  };

  // Logic toggle từng checkbox (Thay thế v-model array của Vue)
  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const currentSelected = form.sideGroups || [];
    if (checked) {
      updateForm("sideGroups", [...currentSelected, groupId]);
    } else {
      updateForm("sideGroups", currentSelected.filter((id) => id !== groupId));
    }
  };

  return (
    <>
      <section className="prose prose-sm dark:prose-invert">
        <p>Export partial scenario</p>
      </section>
      
      <fieldset className="flex flex-col gap-4">
        <InputGroupTemplate label="Select which side groups you want to export">
          <div className="divide-y">
            {sides.map((v) => (
              <div key={v.id} className="grid grid-cols-4 gap-4 py-3">
                <button
                  type="button"
                  className="flex text-sm font-medium hover:underline text-left"
                  onClick={() => toggleSide(v.id)}
                >
                  {v.name}
                </button>

                {v.groups.map((g) => {
                  const groupName = state.sideGroupMap[g]?.name || "Unknown Group";
                  return (
                    <InputCheckbox
                      key={g}
                      label={groupName}
                      // Logic checked kiểm tra xem ID có trong mảng không
                      checked={form.sideGroups.includes(g)}
                      onCheckedChange={(checked) => handleGroupToggle(g, checked === true)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </InputGroupTemplate>

        <InputGroup
          label="Scenario name"
          value={form.scenarioName}
          onChange={(e: any) => updateForm("scenarioName", e.target ? e.target.value : e)} 
          // Note: InputGroup convert trước đó có thể trả về string hoặc event, xử lý cả 2 cho chắc
        />
        
        <InputGroup
          label="Name of downloaded file"
          value={form.fileName}
          onChange={(e: any) => updateForm("fileName", e.target ? e.target.value : e)}
        />
      </fieldset>
    </>
  );
}