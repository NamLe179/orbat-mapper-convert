"use client";

import React, { useState, useEffect, useRef } from "react";
import { nanoid } from "@/utils";
import { useActiveScenario, useSearchActions } from "@/components/injects";
import { ChevronRight } from "lucide-react";
import { stripFileExtension } from "@/utils/files";
import AlertWarning from "@/components/AlertWarning";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import ImportedFileList from "@/components/ImportedFileList";
import type { KmlImportData } from "@/types/importExport";
import { Spinner } from "@/components/ui/spinner";
import {
  getAllChildFoldersFromElement,
  getKmlAsDom,
  getKmlFolders,
} from "@/importexport/kml";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import InputCheckbox from "@/components/InputCheckbox";

interface ImportKMLStepProps {
  loadedData: KmlImportData;
  onCancel: () => void;
  onLoaded: () => void;
}

interface ParsedKmlData {
  kmlDom: Document;
  folders: Map<Element, string>;
}

type FileImportOptions = {
  layerName: string;
  selectedFolders: Set<Element>;
  indeterminateFolders: Set<Element>;
};

type ImportKmlForm = {
  fileOptions: FileImportOptions[];
  layerNames: string[];
  extractStyles: boolean;
  showPointNames: boolean;
};

export default function ImportKMLStep({
  loadedData,
  onCancel,
  onLoaded,
}: ImportKMLStepProps) {
  
  // Hooks
  const { geo } = useActiveScenario();
  const searchActions = useSearchActions();

  // State
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Dùng useRef cho dữ liệu DOM nặng, không cần re-render UI trực tiếp
  const parsedDataMap = useRef<Map<string, ParsedKmlData>>(new Map());

  const [form, setForm] = useState<ImportKmlForm>({
    fileOptions: [],
    layerNames: loadedData.fileInfo.map((f) => stripFileExtension(f.fileName)),
    extractStyles: true,
    showPointNames: true,
  });

  // --- Initialization (onMounted) ---
  useEffect(() => {
    let isMounted = true;

    const parseData = async () => {
      setIsProcessing(true);
      const fileInfoArray: FileImportOptions[] = [];
      
      for (const [index, blobUrl] of loadedData.data.entries()) {
        const kmlDom = await getKmlAsDom(blobUrl);
        const folders = new Map(getKmlFolders(kmlDom));
        
        parsedDataMap.current.set(blobUrl, {
          folders,
          kmlDom,
        });

        fileInfoArray.push({
          layerName: stripFileExtension(
            loadedData.fileInfo[index]?.fileName ?? `KML Layer ${index + 1}`
          ),
          selectedFolders: new Set([...folders.keys()]),
          indeterminateFolders: new Set(),
        });
      }

      if (isMounted) {
        setForm((prev) => ({
          ...prev,
          fileOptions: fileInfoArray,
        }));
        setIsProcessing(false);
      }
    };

    parseData();

    return () => {
      isMounted = false;
    };
  }, [loadedData]);

  // --- Handlers ---

  const handleToggleSelectedFolders = (index: number) => {
    setForm((prev) => {
      const newFileOptions = [...prev.fileOptions];
      const option = { ...newFileOptions[index] };
      
      // Clone sets
      const newSelected = new Set(option.selectedFolders);
      const newIndeterminate = new Set(option.indeterminateFolders);

      if (newSelected.size > 0) {
        // Clear all
        newSelected.clear();
        newIndeterminate.clear();
      } else {
        // Select all
        const parsedFolders = parsedDataMap.current.get(loadedData.data[index])?.folders;
        if (parsedFolders) {
          for (const [k] of parsedFolders) {
            newSelected.add(k);
          }
        }
      }

      option.selectedFolders = newSelected;
      option.indeterminateFolders = newIndeterminate;
      newFileOptions[index] = option;

      return { ...prev, fileOptions: newFileOptions };
    });
  };

  const handleUpdateSelectedFolders = (
    index: number,
    element: Element,
    value: boolean | "indeterminate"
  ) => {
    setForm((prev) => {
      const newFileOptions = [...prev.fileOptions];
      const option = { ...newFileOptions[index] };
      
      const newSelected = new Set(option.selectedFolders);
      const newIndeterminate = new Set(option.indeterminateFolders);

      const parentFolder = element.parentElement;

      if (value === true) {
        newSelected.add(element);
        newIndeterminate.delete(element);
        const childFolders = getAllChildFoldersFromElement(element);
        for (const child of childFolders) {
          newSelected.add(child);
          newIndeterminate.delete(child);
        }
      } else if (value === false) {
        newSelected.delete(element);
        const childFolders = getAllChildFoldersFromElement(element);
        for (const child of childFolders) {
          newSelected.delete(child);
          newIndeterminate.delete(child);
        }
      }

      if (parentFolder) {
        newIndeterminate.add(parentFolder);
        // Note: Vue code gốc có logic check parent nhưng body rỗng trong else.
        // Giữ nguyên logic thêm vào indeterminate nếu có parent.
      }

      option.selectedFolders = newSelected;
      option.indeterminateFolders = newIndeterminate;
      newFileOptions[index] = option;

      return { ...prev, fileOptions: newFileOptions };
    });
  };

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const blobUrl of loadedData.data) {
      const index = loadedData.data.indexOf(blobUrl);
      const { layerName, selectedFolders, indeterminateFolders } = form.fileOptions[index];
      
      const parsedKmlData = parsedDataMap.current.get(blobUrl);
      if (!parsedKmlData) continue;
      
      // Clone KML DOM để không ảnh hưởng dữ liệu gốc (nếu import lại)
      // Tuy nhiên DOM API cloneNode khá phức tạp với XMLSerializer, 
      // ở đây ta thao tác trực tiếp theo logic gốc Vue
      const { kmlDom, folders } = parsedKmlData;

      // remove unselected folders from the DOM
      for (const [folderElement] of folders) {
        if (
          !selectedFolders.has(folderElement) &&
          !indeterminateFolders.has(folderElement)
        ) {
          folderElement.parentElement?.removeChild(folderElement);
        }
      }

      // serialize back to string
      const xmlAsString = new XMLSerializer().serializeToString(kmlDom);
      const kmlBlob = new Blob([xmlAsString], {
        type: "application/vnd.google-earth.kml+xml",
      });
      const newBlobUrl = URL.createObjectURL(kmlBlob);
      URL.revokeObjectURL(blobUrl);

      const newLayer = geo.addMapLayer({
        url: newBlobUrl,
        name: layerName || `KML Layer ${index + 1}`,
        extractStyles: form.extractStyles,
        showPointNames: form.showPointNames,
        id: nanoid(),
        type: "KMLLayer",
      });

      if (searchActions?.onImageLayerSelect) {
         // @ts-ignore
         searchActions.onImageLayerSelect({ layerId: newLayer.id });
      }
    }

    onLoaded();
  };

  return (
    <div>
      <form onSubmit={handleLoad} className="flex max-h-[80vh] flex-col">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>KML import</FieldLegend>
            <ImportedFileList importData={loadedData} />
            <AlertWarning title="Warning">
              KML layers are currently only visible while the scenario is open. They are
              not saved as part of the scenario.
            </AlertWarning>

            {!isProcessing && (
              <FieldGroup>
                {form.fileOptions.map((fileFormData, index) => {
                  const foldersMap = parsedDataMap.current.get(loadedData.data[index])?.folders;
                  const foldersArray = foldersMap ? Array.from(foldersMap.entries()) : [];

                  return (
                    <React.Fragment key={index}>
                      <Field>
                        <FieldLabel htmlFor={`layerName-${index}`}>Vector layer name</FieldLabel>
                        <Input
                          id={`layerName-${index}`}
                          value={fileFormData.layerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => {
                                const next = [...prev.fileOptions];
                                next[index] = { ...next[index], layerName: val };
                                return { ...prev, fileOptions: next };
                            });
                          }}
                        />
                        <FieldDescription>
                          {loadedData.fileInfo[index]?.fileName}
                        </FieldDescription>
                        
                        <Collapsible>
                          {/* Uncontrolled Collapsible, dùng asChild pattern nếu cần */}
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild className="group">
                              <Button type="button" variant="outline" size="sm">
                                Select/toggle folders to import
                                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                              </Button>
                            </CollapsibleTrigger>
                            
                            {/* Nút Toggle All nằm ngoài trigger nhưng logic phụ thuộc trạng thái mở
                                Trong React thuần hơi khó check state của Uncontrolled Component.
                                Ta sẽ luôn hiển thị nút này hoặc chuyển Collapsible sang Controlled nếu cần.
                                Ở đây hiển thị luôn cho đơn giản.
                             */}
                             <Button
                                onClick={() => handleToggleSelectedFolders(index)}
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                Toggle all
                              </Button>
                          </div>
                          
                          <CollapsibleContent className="mt-4 grid grid-cols-1 gap-2 pl-2">
                             {foldersArray.map(([element, folderName], i) => (
                               <InputCheckbox
                                 key={i}
                                 label={folderName || "Unnamed Folder"}
                                 checked={
                                   fileFormData.indeterminateFolders.has(element)
                                     ? "indeterminate"
                                     : fileFormData.selectedFolders.has(element)
                                 }
                                 onCheckedChange={(val) => 
                                   handleUpdateSelectedFolders(index, element, val)
                                 }
                               />
                             ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </Field>
                      <FieldSeparator />
                    </React.Fragment>
                  );
                })}
              </FieldGroup>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field orientation="horizontal" className="">
                <Checkbox 
                    id="extractStyles" 
                    checked={form.extractStyles}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, extractStyles: v === true }))}
                />
                <FieldContent>
                  <FieldLabel htmlFor="extractStyles">Extract styles from KML</FieldLabel>
                  <FieldDescription>Apply KML styling to features</FieldDescription>
                </FieldContent>
              </Field>
              
              <Field orientation="horizontal" className="">
                <Checkbox 
                    id="showPointNames" 
                    checked={form.showPointNames}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, showPointNames: v === true }))}
                />
                <FieldContent>
                  <FieldLabel htmlFor="showPointNames">Show names as labels</FieldLabel>
                  <FieldDescription>
                    Show names as labels for placemarks which contain points.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </div>

            <Field orientation="horizontal" className="justify-between mt-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {isProcessing && (
                  <>
                    <Spinner /> Processing data
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button type="submit">Import</Button>
                <Button variant="outline" type="button" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </Field>
          </FieldSet>
        </FieldGroup>
      </form>
    </div>
  );
}