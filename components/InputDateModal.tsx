"use client";

import React, { useState, useId } from "react";
import { type ScenarioEvent } from "@/types/scenarioModels";
import PrimaryButton from "./PrimaryButton";
import InputGroup from "./InputGroup";
import DescriptionItem from "./DescriptionItem";
import ToggleField from "./ToggleField";
import NewSimpleModal from "./NewSimpleModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScenarioEventsPanel from "@/modules/scenarioeditor/ScenarioEventsPanel";

// Giả định hook này đã được convert. 
// Trong React nó nên trả về value và setter (VD: setDate, setHour...)
import { useDateElements } from "@/hooks/scenarioTime"; 

interface InputDateModalProps {
  dialogTitle?: string;
  timestamp?: number;
  timeZone?: string;
  
  // Thay thế v-model="open"
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Events
  onUpdateTimestamp: (timestamp: number) => void;
  onCancel?: () => void;
}

export default function InputDateModal({
  dialogTitle = "Set scenario date and time",
  timestamp = 386467200000,
  timeZone = "UTC",
  open,
  onOpenChange,
  onUpdateTimestamp,
  onCancel,
}: InputDateModalProps) {
  
  const focusId = useId();

  // Logic tương đương useStorage("utc-mode", false)
  // Trong thực tế bạn nên dùng hook useLocalStorage từ 'usehooks-ts'
  const [enabled, setEnabled] = useState(false); 
  const isLocal = !enabled;

  // Hook xử lý logic ngày tháng (Giả định đã convert sang React Hook)
  // Lưu ý: Hook này cần reactive với props.timestamp và state isLocal
  const { 
    date, setDate, 
    hour, setHour, 
    minute, setMinute, 
    resDateTime 
  } = useDateElements({
    timestamp,
    isLocal,
    timeZone,
  });

  const handleUpdateTime = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTimestamp(resDateTime.valueOf());
    onOpenChange(false);
  };

  const handleEventClick = (event: ScenarioEvent) => {
    onUpdateTimestamp(event.startTime);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <NewSimpleModal 
      open={open} 
      onOpenChange={onOpenChange} 
      dialogTitle={dialogTitle}
    //   onCancel={handleCancel} 
    >
      <Tabs defaultValue="time" className="">
        <TabsList className="w-full">
          <TabsTrigger value="time" className="">Time</TabsTrigger>
          <TabsTrigger value="events" className="">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="time">
          <form onSubmit={handleUpdateTime} className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <DescriptionItem label="Time zone name">
                {timeZone}
              </DescriptionItem>
              <ToggleField checked={enabled} onCheckedChange={setEnabled}>
                UTC mode
              </ToggleField>
            </div>

            {/* Giả định InputGroup đã convert nhận value/onChange */}
            <InputGroup 
              id={focusId} 
              label="Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              autoFocus // React way để focus on mount
            />

            <div className="flex space-x-4">
              <InputGroup 
                label="Hour" 
                value={hour} 
                onChange={(e) => setHour(Number(e.target.value))}
                type="number" 
                min={0} 
                max={23} 
              />
              <InputGroup 
                label="Minute" 
                value={minute} 
                onChange={(e) => setMinute(Number(e.target.value))}
                type="number" 
                min={0} 
                max={59} 
              />
            </div>

            <p className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">
                {/* Giả định resDateTime là object Dayjs hoặc tương tự có hàm format */}
                {resDateTime?.format ? resDateTime.format() : String(resDateTime)}
              </span>
              <PrimaryButton type="submit">Update time</PrimaryButton>
            </p>
          </form>
        </TabsContent>

        <TabsContent value="events">
          <ScenarioEventsPanel 
            selectOnly 
            onEventClick={handleEventClick} 
            hideDropdown 
          />
        </TabsContent>
      </Tabs>
    </NewSimpleModal>
  );
}