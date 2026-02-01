"use client";

import React, { useState } from "react";
import { nanoid } from "@/utils";
import { useActiveScenario, useSearchActions } from "@/components/injects";
import { type ImportedFileInfo } from "@/importexport/fileHandling";
import { stripFileExtension } from "@/utils/files";
import AlertWarning from "@/components/AlertWarning";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ImportImageStepProps {
  objectUrl: string;
  fileInfo: ImportedFileInfo;
  onCancel: () => void;
  onLoaded: () => void;
}

export default function ImportImageStep({
  objectUrl,
  fileInfo,
  onCancel,
  onLoaded,
}: ImportImageStepProps) {
  
  // Access Hooks
  const { geo } = useActiveScenario();
  const searchActions = useSearchActions();

  // Local State
  const [layerName, setLayerName] = useState(() => stripFileExtension(fileInfo.fileName));
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Computed Logic
  const isBlob = objectUrl.startsWith("blob:");

  // Handlers
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    setDimensions({
      width: target.naturalWidth,
      height: target.naturalHeight,
    });
  };

  const handleCancel = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newLayer = geo.addMapLayer({
      url: objectUrl,
      name: layerName,
      id: nanoid(),
      type: "ImageLayer",
    });

    // Trigger action hook (đã được convert sang React Context function)
    if (searchActions?.onImageLayerSelect) {
        // Lưu ý: searchActions trong React thường là hàm gọi trực tiếp, không phải .trigger()
        // trừ khi bạn giữ nguyên kiến trúc EventHook tùy chỉnh.
        // Ở đây giả định theo context chuẩn:
        searchActions.onImageLayerSelect({ layerId: newLayer.id });
    }
    
    onLoaded();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mt-4 flex max-h-[80vh] min-h-100 flex-col">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Image import</FieldLegend>

            {isBlob && (
              <AlertWarning title="Warning">
                This image is a local file and will not be saved with the scenario. It will
                only be visible while the scenario is open.
              </AlertWarning>
            )}

            <div className="flex-auto overflow-auto p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={objectUrl} 
                onLoad={handleImageLoad} 
                alt="Preview" 
                className="max-w-full h-auto"
              />
              {dimensions.width > 0 && (
                <p className="text-muted-foreground mt-2 text-sm">
                  Image dimensions {dimensions.width}x{dimensions.height}
                </p>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor="layerName">Image layer name</FieldLabel>
              <Input 
                id="layerName" 
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)} 
              />
            </Field>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit">Import</Button>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </div>
  );
}