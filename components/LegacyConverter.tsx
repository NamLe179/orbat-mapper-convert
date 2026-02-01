"use client";

import React, { useState, useEffect } from "react";
import InputGroup from "@/components/InputGroup";
import MilSymbol from "@/components/MilSymbol";
import {
  convertLetterSidc2NumberSidc,
  convertNumberSidc2LetterSidc,
} from "@orbat-mapper/convert-symbology";

export default function LegacyConverter() {
  // State cho Input values
  const [letterSidcInput, setLetterSidcInput] = useState("SFGPUCRH----");
  const [numberSidcInput, setNumberSidcInput] = useState("");

  // State cho Symbol Preview (được tính toán từ input)
  const [letterSidc, setLetterSidc] = useState("");
  const [numberSidc, setNumberSidc] = useState("");

  // Initialization (Tương đương watch immediate: true & onMounted)
  useEffect(() => {
    // Khởi tạo giá trị Number dựa trên default Letter
    const initialLetter = "SFGPUCRH----";
    const converted = convertLetterSidc2NumberSidc(initialLetter).sidc || "Unknown value";
    
    setLetterSidc(initialLetter);
    setNumberSidc(converted);
    setNumberSidcInput(converted);

    // Auto focus
    document.getElementById("letterSIDC")?.focus();
  }, []);

  // Handlers
  const handleLetterChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
    // Xử lý InputGroup trả về string hoặc event
    const val = typeof e === "string" ? e : e.target.value;
    
    setLetterSidcInput(val);
    setLetterSidc(val);

    // Logic convert Letter -> Number
    const converted = convertLetterSidc2NumberSidc(val).sidc || "Unknown value";
    setNumberSidc(converted);
    setNumberSidcInput(converted);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
    const val = typeof e === "string" ? e : e.target.value;

    setNumberSidcInput(val);
    setNumberSidc(val);

    // Logic convert Number -> Letter
    const converted = convertNumberSidc2LetterSidc(val).sidc || "Unknown value";
    setLetterSidc(converted);
    setLetterSidcInput(converted);
  };

  return (
    <div className="w-full space-y-4 p-1 pb-8">
      <p>Convert from and to legacy letter based symbol identification codes</p>
      
      <div className="grid grid-cols-4 content-center items-center gap-8">
        <div className="col-span-3">
          <InputGroup
            id="letterSIDC"
            label="Letter based SIDC"
            value={letterSidcInput}
            onChange={handleLetterChange}
          />
        </div>
        
        {/* Giả định MilSymbol đã convert */}
        <MilSymbol sidc={letterSidc} size={30} />

        <div className="col-span-3">
          <InputGroup
            label="Number based SIDC"
            value={numberSidcInput}
            onChange={handleNumberChange}
          />
        </div>

        <MilSymbol sidc={numberSidc} size={30} />
      </div>
    </div>
  );
}