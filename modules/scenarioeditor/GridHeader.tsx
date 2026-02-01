"use client";

import React from "react";
import { type TableColumn } from "@/modules/scenarioeditor/types";

interface GridHeaderProps {
  columns: TableColumn[];
}

export default function GridHeader({ columns }: GridHeaderProps) {
  return (
    <>
      <colgroup>
        <col className="w-10" />
        <col />
        <col />
        <col className="w-1/4" />
      </colgroup>
      <thead className="bg-muted text-muted-foreground">
        <tr>
          {/* Static Empty Header */}
          <th scope="col" className="sticky top-0 z-10">
            <div className="border-border bg-card text-foreground -m-[1.5px] border-b py-3.5 pr-3 pl-6 text-left text-sm font-semibold">
              &nbsp;
            </div>
          </th>

          {/* Static Unit Header */}
          <th scope="col" className="sticky top-0 z-10">
            <div className="border-border bg-card text-foreground -m-[1.5px] border-b py-3.5 pr-3 pl-6 text-left text-sm font-semibold">
              Unit
            </div>
          </th>

          {/* Dynamic Columns */}
          {columns.map((column) => (
            <th
              key={column.value}
              scope="col"
              className="sticky top-0 z-10"
            >
              <div className="border-border bg-card text-foreground -my-0.5 -ml-0.5 border-b border-l py-3.5 pr-3 pl-3 text-left text-sm font-semibold">
                {column.label}
              </div>
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}