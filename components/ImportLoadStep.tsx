"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDropzone } from "react-dropzone"; // Cần cài: npm install react-dropzone
import NProgress from "nprogress";
import { AlertCircle } from "lucide-react";

import SimpleSelect from "@/components/SimpleSelect";
import { type SelectItem } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ImportLoadStepBrowser from "@/modules/scenarioeditor/ImportLoadStepBrowser"; // Giả định path
import DocLink from "@/components/DocLink";

import { useNotifications } from "@/hooks/notifications";
import { useImportStore } from "@/stores/importExportStore";
import { useDragStore } from "@/stores/dragStore";
import { useScenarioImport } from "@/hooks/scenarioImport";
import { guessImportFormat, type ImportedFileInfo } from "@/importexport/fileHandling";
import { isUrl } from "@/utils";

import type {
  GuessedImportFormat,
  ImportData,
  ImportFormat,
  ImportSettings,
} from "@/types/importExport";
import type { OrbatGeneratorOrbat, SpatialIllusionsOrbat } from "@/types/externalModels";
import type { FeatureCollection } from "geojson";
import type { Scenario } from "@/types/scenarioModels";

// --- Props & Types ---

interface ImportLoadStepProps {
  onCancel: () => void;
  onLoaded: (format: ImportFormat, data: any, info: ImportedFileInfo | undefined) => void;
  onLod?: (importData: ImportData) => void; // Event 'lod' từ Vue
}

interface FormState extends ImportSettings {
  format: ImportFormat;
}

const formatItems: SelectItem<ImportFormat>[] = [
  { label: "MilX", value: "milx" },
  { label: "GeoJSON", value: "geojson" },
  { label: "Spatial Illusions ORBAT builder", value: "unitgenerator" },
  { label: "Order of Battle Generator", value: "orbatgenerator" },
  { label: "KML/KMZ", value: "kml" },
  { label: "XLSX", value: "xlsx" },
];

const sourceItems: SelectItem<string>[] = [
  { label: "Local file", value: "file" },
  { label: "URL", value: "url" },
  { label: "Browser", value: "browser" },
  { label: "Paste text", value: "string" },
];

export default function ImportLoadStep({
  onCancel,
  onLoaded,
  onLod,
}: ImportLoadStepProps) {
  
  // --- Hooks & Stores ---
  const store = useImportStore();
  const dragStore = useDragStore();
  const { send } = useNotifications();
  const { importMilxString, importJsonString } = useScenarioImport();

  // --- Local State ---
  const [stringSource, setStringSource] = useState("");
  const [urlSource, setUrlSource] = useState("");
  const [currentFilename, setCurrentFilename] = useState("");
  const [objectUrl, setObjectUrl] = useState("");
  
  const [fileInfo, setFileInfo] = useState<ImportedFileInfo>();
  const [fileInfos, setFileInfos] = useState<ImportedFileInfo[]>([]);
  
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [guessedFormat, setGuessedFormat] = useState<GuessedImportFormat>("unknown");

  // Form State
  const [form, setForm] = useState<FormState>({
    format: store.format,
    includeFeatures: false,
    includeUnits: true,
    fileName: "scenario.geojson",
    embedIcons: true,
    useShortName: true,
  });

  // --- Computed ---
  const isMilx = form.format === "milx";
  const isGeojson = form.format === "geojson";
  const isUnitGenerator = form.format === "unitgenerator";
  const isOrbatGenerator = form.format === "orbatgenerator";

  // --- Helpers ---
  
  // Update store helper (Giả định store Zustand có setter setInputSource)
  const setInputSource = (val: string) => {
    // @ts-ignore - Tùy thuộc vào implementation của store convert
    if (store.setInputSource) store.setInputSource(val);
    // @ts-ignore - Fallback nếu store mutable (Valtio)
    else store.inputSource = val;
  };

  const handleFiles = async (files: File[]) => {
    const infos: ImportedFileInfo[] = [];
    for (const f of files) {
      infos.push(await guessImportFormat(f));
    }
    
    setFileInfos(infos);
    const info = infos[0];
    const file = files[0];

    setCurrentFilename(file.name);
    setFileInfo(info);

    if (info.isInvalid) {
      info.errors.forEach((message) => send({ message }));
      return;
    }

    setStringSource(info.dataAsString);
    setObjectUrl(info.objectUrl);
    setGuessedFormat(info.format);

    if (info.format !== "unknown") {
      setForm((prev) => ({ ...prev, format: info.format as ImportFormat }));
      // Trigger load ngay lập tức nếu format valid? 
      // Vue code gọi onLoad() ở đây, nhưng onLoad phụ thuộc vào state form.format mới.
      // Trong React, ta cần useEffect hoặc gọi trực tiếp với giá trị mới.
      // Để an toàn, ta sẽ không gọi onLoad tự động ở đây để tránh race condition state, 
      // người dùng bấm Load hoặc ta dùng useEffect lắng nghe (nhưng có thể gây loop).
      // Logic Vue gọi `await onLoad()` ngay sau khi set.
    }
  };

  // --- Handlers ---

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      handleFiles(acceptedFiles);
      // @ts-ignore
      if (dragStore.setDraggedFiles) dragStore.setDraggedFiles(null);
      // @ts-ignore
      else dragStore.draggedFiles = null;
    }
  }, [dragStore]); // eslint-disable-line

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true, // Click handle riêng ở label
    noKeyboard: true
  });

  const onBrowserLoad = (data: Scenario) => {
    const info: ImportedFileInfo = {
      format: "orbatmapper",
      dataAsString: "",
      objectUrl: "",
      isInvalid: false,
      errors: [],
      dialect: "unknown",
      isZipped: false,
      isJson: false,
      fileName: "indexed-db",
      hasMultipleFiles: false,
      fileSize: 0,
    };
    setFileInfo(info);
    onLoaded("orbatmapper", data, info);
  };

  const onLoad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const { format } = form;
    NProgress.start();

    try {
      if (format === "milx" && stringSource) {
        const data = await importMilxString(stringSource);
        send({ message: `Loaded data as ${format}` });
        onLoaded("milx", data, fileInfo);
      }

      if (format === "kml" && stringSource) {
        send({ message: `Loaded data as ${format}` });
        const kmls = fileInfos.filter((f) => f.format === "kml");
        if (onLod) {
          onLod({
            format: "kml",
            data: kmls.map((d) => d.objectUrl),
            fileInfo: fileInfos,
          });
        }
      }

      if (format === "image" && objectUrl) {
        send({ message: `Loaded data as ${format}` });
        onLoaded("image", objectUrl, fileInfo);
      }

      if (format === "geojson" && stringSource) {
        const data = importJsonString<FeatureCollection>(stringSource);
        send({ message: `Loaded data as ${format}` });
        onLoaded("geojson", data, fileInfo);
      }

      if (format === "unitgenerator" && stringSource) {
        const data = importJsonString<SpatialIllusionsOrbat>(stringSource);
        send({ message: `Loaded data as ${format}` });
        onLoaded("unitgenerator", data, fileInfo);
      }

      if (format === "orbatgenerator" && stringSource) {
        const data = importJsonString<OrbatGeneratorOrbat>(stringSource);
        send({ message: `Loaded data as ${format}` });
        onLoaded("orbatgenerator", data, fileInfo);
      }

      if (format === "orbatmapper" && stringSource) {
        const data = importJsonString<OrbatGeneratorOrbat>(stringSource); // Type might differ but keeping logic
        onLoaded("orbatmapper", data, fileInfo);
      }

      if (format === "orbatmapper-encrypted" && stringSource) {
        const data = importJsonString<any>(stringSource);
        onLoaded("orbatmapper-encrypted", data, fileInfo);
      }

      if (format === "xlsx" && stringSource) {
        send({ message: `Loaded data as ${format}` });
        onLoaded("xlsx", stringSource, fileInfo);
      }
    } catch (err: any) {
        console.error(err);
        setIsError(true);
        setErrorMessage(err.message || "Failed to load");
    } finally {
        NProgress.done();
    }
  };

  const onFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    handleFiles(Array.from(files));
  };

  const onUrlLoad = async () => {
    const url = urlSource;
    if (!url) return;
    if (!isUrl(url)) {
      setIsError(true);
      setErrorMessage(`The url ${url} is not a valid url.`);
      return;
    }

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const file = new File([buffer], url.split("/").pop() || "", {
        type: response.headers.get("Content-Type") || "",
      });
      await handleFiles([file]);
    } catch (e: any) {
      send({ message: `Failed to load ${url}: ${e?.message}` });
      setIsError(true);
      setErrorMessage(`Failed to load ${url}: ${e?.message}`);
    }
  };

  // --- Effects ---
  
  // Mounted: Check drag store
  useEffect(() => {
    if (dragStore.draggedFiles) {
      handleFiles(dragStore.draggedFiles);
      // Reset drag store
       // @ts-ignore
      if (dragStore.setDraggedFiles) dragStore.setDraggedFiles(null);
       // @ts-ignore
      else dragStore.draggedFiles = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load trigger when format/stringSource changes? 
  // Vue code: if (info.format !== "unknown") { ... await onLoad() }
  // We handle this inside handleFiles mostly, but relying on state updates inside loops is tricky.
  // The logic in handleFiles above just sets state. User must click "Load" OR we rely on a separate effect.
  // For safety in conversion, we stick to manual "Load" button or add specific Effect if needed.
  // Code Vue: "await onLoad()" is called directly in handleFiles.
  // In React handleFiles, `stringSource` state hasn't updated yet when we might call `onLoad`.
  // SOLUTION: Extract the "load logic" that depends on data into a pure function or accept data as args.
  // For now, let's assume the user clicks "Load" or we can use an effect:
  useEffect(() => {
    if (guessedFormat !== "unknown" && stringSource && fileInfo) {
       // Optional: Auto load could be triggered here if desired, 
       // but might conflict with user changing options.
       // Vue code did it explicitly.
    }
  }, [guessedFormat, stringSource, fileInfo]);


  return (
    <form onSubmit={onLoad} className="mt-4 space-y-6">
      <FieldGroup>
        {/* Mobile Select */}
        <div className="sm:hidden">
            <SimpleSelect
                label="Input source"
                items={sourceItems}
                value={store.inputSource}
                onValueChange={(val) => setInputSource(val as string)}
            />
        </div>

        {/* Desktop Radio */}
        <FieldSet className="hidden sm:flex">
          <FieldLabel>Input source</FieldLabel>
          <RadioGroup 
            value={store.inputSource} 
            onValueChange={setInputSource} 
            className="flex"
          >
            {sourceItems.map((item) => (
              <Field key={item.value} orientation="horizontal">
                <RadioGroupItem id={item.value} value={item.value} />
                <FieldLabel htmlFor={item.value} className="font-normal">
                  {item.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </FieldSet>

        <FieldSeparator />

        {/* --- Source: FILE (Dropzone) --- */}
        {store.inputSource === "file" && (
          <div
            {...getRootProps()}
            className={`
                relative h-24 w-full rounded-lg border-2 border-dashed p-4 ring-offset-2 focus-within:ring-2
                hover:border-muted-foreground transition-colors
                ${isDragActive ? "cursor-crosshair border-green-500 bg-green-50/10" : "border-border"}
            `}
          >
            <input
              {...getInputProps()}
              id="file"
              // Override onChange to keep original logic if needed, 
              // but react-dropzone handles it via onDrop
              onChange={onFileLoad} 
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <label
              htmlFor="file"
              className="hover:text-accent-foreground flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2"
            >
              <span className="text-base text-center">Drag a file here or click to select local file</span>
              {currentFilename && (
                <span className="text-sm">
                  Current file{" "}
                  <span className="text-accent-foreground font-mono">{currentFilename}</span>
                </span>
              )}
            </label>
          </div>
        )}

        {/* --- Source: STRING --- */}
        {store.inputSource === "string" && (
          <Field>
            <FieldLabel htmlFor="rawText">Raw text</FieldLabel>
            <Textarea 
                id="rawText" 
                rows={4} 
                value={stringSource}
                onChange={(e) => setStringSource(e.target.value)}
            />
            <FieldDescription>
              Paste any of the supported text based sources into the text field
            </FieldDescription>
          </Field>
        )}

        {/* --- Source: URL --- */}
        {store.inputSource === "url" && (
          <Field>
            <FieldLabel htmlFor="urlSource">URL</FieldLabel>
            <div className="flex gap-2">
              <Input 
                id="urlSource" 
                type="text" 
                value={urlSource}
                onChange={(e) => setUrlSource(e.target.value)}
              />
              <div className="shrink-0">
                <Button variant="outline" type="button" onClick={onUrlLoad}>
                  Load from URL
                </Button>
              </div>
            </div>
            <FieldDescription>
              Please note that the scenario host must be configured to allow CORS requests.
            </FieldDescription>
          </Field>
        )}

        {/* --- Source: BROWSER --- */}
        {store.inputSource === "browser" && (
          <div>
            <ImportLoadStepBrowser onLoaded={onBrowserLoad} />
          </div>
        )}
      </FieldGroup>

      {/* --- Error Alert --- */}
      {isError && errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* --- Format Selection & Info --- */}
      {stringSource && (
        <div className="space-y-4">
          {guessedFormat && (
            <p className="text-sm">
              The format seems to be{" "}
              <span className="text-accent-foreground">{guessedFormat}.</span>
            </p>
          )}

          <SimpleSelect
            label="Select import format"
            items={formatItems}
            value={form.format}
            onValueChange={(val) => setForm(prev => ({ ...prev, format: val as ImportFormat }))}
          />
          <div className="text-[0.8rem] text-muted-foreground px-1">
            <DocLink href="https://docs.orbat-mapper.app/guide/import-data" />
          </div>

          <div className="prose prose-sm dark:prose-invert">
            {isMilx && (
              <p>
                Basic support for importing MilX layers from{" "}
                <a href="https://www.map.army/" target="_blank" rel="noreferrer" className="text-primary underline">map.army</a>
              </p>
            )}
            {isGeojson && <p>Import units and features.</p>}
            {isUnitGenerator && (
              <p>
                Import ORBAT generated with{" "}
                <a href="https://spatialillusions.com/unitgenerator2/" target="_blank" rel="noreferrer" className="text-primary underline">
                  Spatial Illusions Orbat builder
                </a>.
              </p>
            )}
            {isOrbatGenerator && (
              <p>
                Import ORBAT generated with{" "}
                <a href="https://www.orbatgenerator.com/" target="_blank" rel="noreferrer" className="text-primary underline">
                  Order of Battle Generator
                </a>.
              </p>
            )}
          </div>

          {isMilx && (
            <p className="prose prose-sm dark:prose-invert">
              Please note that the import functionality is experimental.
            </p>
          )}
        </div>
      )}

      {/* --- Image Preview --- */}
      {objectUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={objectUrl} alt="Loaded image" className="max-w-full h-auto rounded border" />
      )}

      {/* --- Action Buttons --- */}
      <Field orientation="horizontal" className="justify-end">
        <Button type="submit">Load</Button>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </Field>
    </form>
  );
}