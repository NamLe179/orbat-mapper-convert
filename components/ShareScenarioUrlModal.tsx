"use client";

import React, { useState, useEffect } from "react";
import NewSimpleModal from "@/components/NewSimpleModal";
import { Button } from "@/components/ui/button";
import InputGroup from "@/components/InputGroup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardCopy, TriangleAlert } from "lucide-react";
import DocLink from "@/components/DocLink";

import { useActiveScenario } from "@/components/injects";
import { useScenarioShare } from "@/hooks/scenarioShare";

interface ShareScenarioUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareScenarioUrlModal({
  open,
  onOpenChange,
}: ShareScenarioUrlModalProps) {
  
  // Hooks
  const activeScenario = useActiveScenario();
  const { shareScenario } = useScenarioShare();

  // State
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [urlWarning, setUrlWarning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Effect: Generate URL khi modal mở
  useEffect(() => {
    let isMounted = true;

    const generate = async () => {
      if (!open) return;
      
      setIsLoading(true);
      setUrlWarning("");
      setGeneratedUrl("");
      
      try {
        const { url, warning } = await shareScenario(activeScenario);
        if (isMounted) {
          setGeneratedUrl(url);
          setUrlWarning(warning || "");
        }
      } catch (error) {
        console.error("Failed to generate URL", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [open, activeScenario, shareScenario]);

  // Handlers
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

  // Render phần description (chứa cả text và link)
  const descriptionContent = (
    <span>
      Share this scenario by copying the URL below. The URL contains all scenario
      data.{" "}
      <DocLink href="https://docs.orbat-mapper.app/guide/sharing-scenarios">
        Learn more.
      </DocLink>
    </span>
  );

  return (
    <NewSimpleModal
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Share scenario as URL"
      className="sm:max-w-xl"
      description={descriptionContent}
    >
      <div className="space-y-4">
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            Only use this feature for small to medium scenarios. Browsers and
            servers have limits on URL lengths. Always try the generated URL
            before sharing it.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex justify-center py-4">Generating URL...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <InputGroup
                value={generatedUrl}
                label="Sharable URL"
                className="grow"
                readOnly
                onClick={(e: React.MouseEvent<HTMLInputElement>) =>
                  e.currentTarget.select()
                }
              />
              <Button onClick={handleCopy} className="mb-0.5">
                {copied ? "Copied!" : "Copy URL"}
                <ClipboardCopy className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm">
              <span className="font-medium">URL length: </span>
              {generatedUrl.length} characters
            </div>

            {urlWarning && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertDescription>{urlWarning}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </NewSimpleModal>
  );
}