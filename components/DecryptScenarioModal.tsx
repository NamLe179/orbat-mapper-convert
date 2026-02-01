"use client";

import React, { useState } from "react";
import NewSimpleModal from "@/components/NewSimpleModal";
import InputGroup from "@/components/InputGroup";
import InputCheckbox from "@/components/InputCheckbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { decryptScenario } from "@/utils/crypto";
import type { EncryptedScenario, Scenario } from "@/types/scenarioModels";

interface DecryptScenarioModalProps {
  encryptedScenario: EncryptedScenario;
  // Thay thế cho v-model="open"
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Events
  onDecrypted: (scenario: Scenario) => void;
  onCancel?: () => void;
}

export default function DecryptScenarioModal({
  encryptedScenario,
  open,
  onOpenChange,
  onDecrypted,
  onCancel,
}: DecryptScenarioModalProps) {
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState("");

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsDecrypting(true);
    setError("");

    try {
      const decrypted = await decryptScenario(encryptedScenario, password);
      onDecrypted(decrypted);
      onOpenChange(false);
      // Reset state sau khi thành công nếu cần
      setPassword("");
    } catch (e: any) {
      console.error(e);
      setError("Decryption failed. Invalid password or corrupted file.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <NewSimpleModal
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Decrypt Scenario"
      className="sm:max-w-md"
    >
      <form className="space-y-4" onSubmit={handleDecrypt}>
        <p className="text-muted-foreground text-sm">
          This scenario is encrypted. Please enter the password to open it.
        </p>

        {encryptedScenario.header?.description && (
          <div className="bg-secondary text-secondary-foreground rounded-md p-3 text-sm">
            <span className="font-medium">Description: </span>
            {encryptedScenario.header.description}
          </div>
        )}

        {/* Giả định InputGroup đã convert sang React nhận value và onChange */}
        <InputGroup
          label="Password"
          type={showPassword ? "text" : "password"}
          autoFocus
          placeholder="Enter password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement> | string) => {
             // Xử lý tùy thuộc InputGroup trả về event hay string
             if (typeof e === 'string') setPassword(e);
             else setPassword(e.target.value);
          }}
        />

        {/* Giả định InputCheckbox nhận checked và onCheckedChange */}
        <InputCheckbox
          label="Show password"
          checked={showPassword}
          onCheckedChange={(checked) => setShowPassword(checked === true)}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!password || isDecrypting}>
            {isDecrypting ? "Decrypting..." : "Open"}
          </Button>
        </div>
      </form>
    </NewSimpleModal>
  );
}