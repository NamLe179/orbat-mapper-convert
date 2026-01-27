import React from "react";
import prettyBytes from "pretty-bytes";
import { Paperclip } from "lucide-react";
import { Item, ItemContent, ItemGroup, ItemMedia } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import type { ImportData } from "@/types/importExport";

interface ImportedFileListProps {
  importData: ImportData;
}

export default function ImportedFileList({ importData }: ImportedFileListProps) {
  // Logic v-if: Nếu không phải array, không render gì cả
  if (!Array.isArray(importData.fileInfo)) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-6">
      <span className="text-muted-foreground font-medium">Loaded files</span>
      
      <ItemGroup className="flex-auto">
        {importData.fileInfo.map((file, index) => (
          <Item
            key={index} // Tốt nhất nên dùng file.id nếu có, tạm thời dùng index theo code cũ
            variant="outline"
            size="sm"
          >
            <ItemMedia>
              <Paperclip className="size-4" />
            </ItemMedia>
            
            <ItemContent className="flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-mono font-medium">{file.fileName}</span>
                <span className="text-muted-foreground">
                  {prettyBytes(file.fileSize)} bytes
                </span>
              </div>
              <Badge variant="secondary">{file.format}</Badge>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}