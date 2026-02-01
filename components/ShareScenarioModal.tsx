"use client";

import React, { useState } from "react";
import NewSimpleModal from "@/components/NewSimpleModal";
import { Button } from "@/components/ui/button";
import InputGroup from "@/components/InputGroup";
import ToggleField from "@/components/ToggleField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardCopy, LoaderCircle, TriangleAlert } from "lucide-react";
import { useActiveScenario } from "@/components/injects";
import { encryptScenario } from "@/utils/crypto";

interface ShareScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHARE_API_URL = "/share";

export default function ShareScenarioModal({
  open,
  onOpenChange,
}: ShareScenarioModalProps) {
  
  // Hooks
  const { io } = useActiveScenario(); // Giả định useActiveScenario trả về { io, ... }

  // State
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [useEncryption, setUseEncryption] = useState(false);
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Handlers
  const handleGenerateLink = async () => {
    setIsLoading(true);
    setError("");

    try {
      const scenarioData = io.serializeToObject();
      let uploadData: any = scenarioData;

      if (useEncryption) {
        if (!password) return;
        uploadData = await encryptScenario(scenarioData, password, {
          header: { description: description },
        });
      }

      const response = await fetch(SHARE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ORBAT-SECRET":
            process.env.NEXT_PUBLIC_ORBAT_SECRET ||
            "I9ZJ4z4FDtLFXpvHKIT2TALl7k9BUDRYr5Jj3IBF7A7Jp8KJDOR",
        },
        body: JSON.stringify(uploadData),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Scenario is too large to share.");
        }
        if (response.status === 429) {
          throw new Error("You have reached the hourly upload limit.");
        }
        throw new Error("Failed to share scenario.");
      }

      const { id } = await response.json();
      setGeneratedUrl(`${window.location.origin}/import?id=${id}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Helper để reset state khi đóng modal nếu cần (Optional)
  // useEffect(() => { if(!open) { setGeneratedUrl(""); setError(""); ... } }, [open]);

  return (
    <NewSimpleModal
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Share scenario"
      className="sm:max-w-xl"
      description="Share this scenario by copying the link below. The link will remain valid for 30 days."
    >
      <div className="space-y-4">
        {/* State: Loading */}
        {isLoading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8">
            <LoaderCircle className="animate-spin" />
            Generating Link...
          </div>
        )}

        {/* State: Error */}
        {!isLoading && error && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <TriangleAlert className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleGenerateLink}>Try Again</Button>
            </div>
          </div>
        )}

        {/* State: Success (Link Generated) */}
        {!isLoading && !error && generatedUrl && (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <InputGroup
                value={generatedUrl}
                label="Sharable URL"
                className="grow"
                readOnly
                onClick={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.select()}
              />
              <Button onClick={handleCopy} className="mb-0.5">
                {copied ? "Copied!" : "Copy Link"}
                <ClipboardCopy className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <Alert>
              <TriangleAlert className="size-4" />
              <AlertDescription>
                Anyone with the link can view this scenario.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* State: Initial Form */}
        {!isLoading && !error && !generatedUrl && (
          <div className="space-y-4">
            <Alert>
              <TriangleAlert className="size-4" />
              <AlertDescription>
                WARNING. Clicking the &quot;upload&quot; button will upload your scenario
                to the cloud. Anyone with the link{" "}
                {useEncryption ? "and password" : ""} can view the scenario.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 pt-2">
              <ToggleField
                checked={useEncryption}
                onCheckedChange={setUseEncryption}
              >
                Encrypt scenario
              </ToggleField>

              {useEncryption && (
                <div className="space-y-4 rounded-md border p-4">
                  <InputGroup
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                  />

                  <ToggleField
                    checked={showPassword}
                    onCheckedChange={setShowPassword}
                  >
                    Show password
                  </ToggleField>

                  <div>
                    <InputGroup
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      label="Description (optional)"
                      placeholder="Description"
                    />
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
                      Warning: This description is visible without the password.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p>
              Click the button below to upload the scenario and generate a
              shareable link.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateLink}
                disabled={useEncryption && !password}
              >
                Upload and generate link
              </Button>
            </div>
          </div>
        )}
      </div>
    </NewSimpleModal>
  );
}