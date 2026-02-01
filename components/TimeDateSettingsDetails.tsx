"use client";

import React, { useEffect, useState } from "react";
import RadioGroupList from "@/components/RadioGroupList";
import LanguageSelect from "@/components/LanguageSelect";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import SimpleSelect from "@/components/SimpleSelect";
import {
  intlItems,
  timeFormatItems,
  type TimeFormatSettings,
  type TimeFormat, 
} from "@/stores/timeFormatStore";

interface TimeDateSettingsDetailsProps {
  sampleTime: string;
  settings: TimeFormatSettings;
  onSettingsChange: (settings: TimeFormatSettings) => void;
}

export default function TimeDateSettingsDetails({
  sampleTime,
  settings,
  onSettingsChange,
}: TimeDateSettingsDetailsProps) {
  
  // State lưu thông tin locale browser (xử lý SSR safe)
  const [browserInfo, setBrowserInfo] = useState({ locale: "", name: "" });

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      try {
        const locale = navigator.language;
        const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
        const name = languageNames.of(locale) || locale;
        setBrowserInfo({ locale, name });
      } catch (e) {
        setBrowserInfo({ locale: navigator.language, name: navigator.language });
      }
    }
  }, []);

  const updateSetting = <K extends keyof TimeFormatSettings>(
    key: K,
    value: TimeFormatSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <RadioGroupList
        value={settings.timeFormat}
        onValueChange={(val) => updateSetting("timeFormat", val as TimeFormat)}
        items={timeFormatItems}
      />

      {settings.timeFormat === "local" && (
        <>
          <InputGroupTemplate 
            label="Language"
            description={
                browserInfo.locale ? (
                    <>
                        Browser locale is{" "}
                        <span className="font-medium">
                            {browserInfo.name}({browserInfo.locale})
                        </span>
                    </>
                ) : undefined
            }
          >
            <LanguageSelect
              value={settings.locale}
              onChange={(val) => updateSetting("locale", val)}
            />
          </InputGroupTemplate>

          <div className="grid grid-cols-2 gap-4">
            <SimpleSelect
              label="Date style"
              value={settings.dateStyle}
              onValueChange={(val) => 
                updateSetting("dateStyle", val as Intl.DateTimeFormatOptions["dateStyle"])
              }
              items={intlItems}
            />
            <SimpleSelect
              label="Time style"
              value={settings.timeStyle}
              onValueChange={(val) => 
                updateSetting("timeStyle", val as Intl.DateTimeFormatOptions["timeStyle"])
              }
              items={intlItems}
            />
          </div>
        </>
      )}

      <div className="pt-2">
        <p className="text-sm font-semibold">Preview:</p>
        <p>{sampleTime}</p>
      </div>
    </div>
  );
}