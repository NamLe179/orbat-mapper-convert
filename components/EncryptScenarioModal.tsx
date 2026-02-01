"use client";

import React, { useState } from "react";
import NewSimpleModal from "@/components/NewSimpleModal";
import InputGroup from "@/components/InputGroup";
import InputCheckbox from "@/components/InputCheckbox";
import { Button } from "@/components/ui/button";
import { useActiveScenario } from "@/components/injects"; 
import { useNotifications } from "@/hooks/notifications"; 
import { encryptScenario } from "@/utils/crypto";
import { saveBlobToLocalFile } from "@/utils/files";

// Không cần import TScenario vì hook useActiveScenario đã typed sẵn

interface EncryptScenarioModalProps {
  // Thay thế v-model="open"
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EncryptScenarioModal({
  open,
  onOpenChange,
}: EncryptScenarioModalProps) {
  
  // Access Context/Store
  const activeScenario = useActiveScenario();
  const { io } = activeScenario;
  const { send } = useNotifications();

  // Local State
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsEncrypting(true);

    try {
      const scenario = io.serializeToObject();
      const encrypted = await encryptScenario(scenario, password, {
        header: { description: description },
      });

      // Dynamic import để tránh lỗi SSR hoặc bundle size (giữ nguyên logic gốc)
      // @ts-ignore
      const { default: filenamify } = await import("filenamify/browser");
      const filename = filenamify(scenario.name || "scenario");

      await saveBlobToLocalFile(
        new Blob([JSON.stringify(encrypted, null, 2)], {
          type: "application/json",
        }),
        `${filename}.json`
      );

      send({ message: "Encrypted scenario downloaded" });
      
      // Reset & Close
      onOpenChange(false);
      setPassword("");
      setDescription("");
    } catch (e) {
      console.error(e);
      send({ message: "Failed to encrypt scenario" });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <NewSimpleModal
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Download encrypted scenario"
      className="sm:max-w-md"
    >
      <form className="space-y-4" onSubmit={handleDownload}>
        <p className="text-muted-foreground text-sm">
          Enter a password to encrypt the scenario. You will need this password to open the
          scenario later.
        </p>

        <InputGroup
          label="Password"
          type={showPassword ? "text" : "password"}
          autoFocus
          placeholder="Enter password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement> | string) => {
              if (typeof e === 'string') setPassword(e);
              else setPassword(e.target.value);
          }}
        />

        <InputCheckbox
          label="Show password"
          checked={showPassword}
          onCheckedChange={(val) => setShowPassword(val === true)}
        />

        <div>
          <InputGroup
            label="Description (optional)"
            placeholder="Description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement> | string) => {
                if (typeof e === 'string') setDescription(e);
                else setDescription(e.target.value);
            }}
          />
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
            Warning: This description is visible without the password.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!password || isEncrypting}>
            {isEncrypting ? "Encrypting..." : "Download Encrypted"}
          </Button>
        </div>
      </form>
    </NewSimpleModal>
  );
}