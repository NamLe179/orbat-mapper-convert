"use client";

import React from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { X, MinusCircle } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Giả định component này đã convert
import MilitarySymbol from "@/components/NewMilitarySymbol";

// --- Types ---
export type NestedUnitStatItem = {
  key: string;
  label: string;
  sidc: string;
  children?: NestedUnitStatItem[];
};

interface FilterTreeProps {
  tree: NestedUnitStatItem[];
  stats: Record<string, number>;
  selectedStats: Record<string, number>;
  excludedKeys: Set<string>;
  
  // v-model replacements
  expandedKeys?: string[];
  onExpandedChange?: (keys: string[]) => void;

  // Events
  onSelect?: (item: NestedUnitStatItem) => void;
  onClear?: (key: string) => void;
  onExclude?: (key: string) => void;
  onClearExclude?: (key: string) => void;
}

// --- Recursive Tree Node Component ---
interface TreeNodeProps extends Omit<FilterTreeProps, "tree" | "expandedKeys" | "onExpandedChange"> {
  node: NestedUnitStatItem;
  level: number;
  expandedKeys: Set<string>;
  toggleExpand: (key: string) => void;
}

const TreeNode = ({
  node,
  level,
  stats,
  selectedStats,
  excludedKeys,
  expandedKeys,
  toggleExpand,
  onSelect,
  onClear,
  onExclude,
  onClearExclude,
}: TreeNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedKeys.has(node.key);
  const isExcluded = excludedKeys.has(node.key);

  return (
    <li className="list-none">
      <div
        className={cn(
          "focus:ring-accent-foreground/50 group hover:bg-muted my-0.5 flex items-center rounded px-2 py-1 outline-hidden focus:ring-2 select-none",
          // Giả lập behavior của Reka UI: even/odd row styling có thể cần điều chỉnh nếu muốn chính xác tuyệt đối trên flat list, 
          // nhưng với nested list thì CSS này áp dụng theo block.
          "even:bg-muted/60 dark:even:bg-muted/50", 
          isExcluded && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 1}em` }} // Vue dùng level - 1, React start level=0 nên chỉnh lại chút cho khớp visual
        onClick={(e) => {
           // Prevent trigger nếu click vào button con
           if (e.defaultPrevented) return;
           onSelect?.(node);
        }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.key);
            }}
          >
            <ChevronRightIcon
              className={cn(
                "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground h-6 w-6 transition hover:font-medium",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        {/* Content */}
        <div className="flex w-full items-center justify-between pl-0">
          <div className="flex cursor-pointer items-center gap-1">
            <MilitarySymbol
              sidc={node.sidc}
              size={16}
              options={{ monoColor: "currentColor" }}
              className="text-foreground/90 w-7"
            />
            <span>{node.label}</span>
            <Badge variant="outline" className="ml-1">
              {stats[node.key] ?? 0}
            </Badge>
          </div>

          {/* Actions Right Side */}
          {selectedStats[node.key] ? (
            <Badge
              variant="secondary"
              className="border-border border cursor-pointer hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.(node.key);
              }}
              title="Clear selected"
            >
              {selectedStats[node.key]}
            </Badge>
          ) : !isExcluded ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExclude?.(node.key);
              }}
              title="Exclude"
            >
              <MinusCircle className="group-hover:text-muted-foreground group-focus:text-muted-foreground text-muted-foreground h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearExclude?.(node.key);
              }}
              title="Clear exclude"
            >
              <X className="text-foreground h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Render Children Recursively */}
      {hasChildren && isExpanded && (
        <ul className="m-0 p-0">
          {node.children!.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              level={level + 1}
              stats={stats}
              selectedStats={selectedStats}
              excludedKeys={excludedKeys}
              expandedKeys={expandedKeys}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onClear={onClear}
              onExclude={onExclude}
              onClearExclude={onClearExclude}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// --- Main Component ---
export default function FilterTree({
  tree,
  stats,
  selectedStats,
  excludedKeys,
  expandedKeys = [],
  onExpandedChange,
  onSelect,
  onClear,
  onExclude,
  onClearExclude,
}: FilterTreeProps) {
  
  // Helper to handle expansion toggle
  const handleToggleExpand = (key: string) => {
    if (!onExpandedChange) return;
    
    const newExpanded = expandedKeys.includes(key)
      ? expandedKeys.filter((k) => k !== key)
      : [...expandedKeys, key];
      
    onExpandedChange(newExpanded);
  };

  // Set để tra cứu nhanh hơn trong recursive component
  const expandedSet = new Set(expandedKeys);

  return (
    <ul className="list-none rounded-lg text-sm select-none p-0 m-0">
      {tree.map((node) => (
        <TreeNode
          key={node.key}
          node={node}
          level={0}
          stats={stats}
          selectedStats={selectedStats}
          excludedKeys={excludedKeys}
          expandedKeys={expandedSet}
          toggleExpand={handleToggleExpand}
          onSelect={onSelect}
          onClear={onClear}
          onExclude={onExclude}
          onClearExclude={onClearExclude}
        />
      ))}
    </ul>
  );
}