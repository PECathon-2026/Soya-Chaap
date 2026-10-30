"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, FileCode, CheckCircle2, ShieldCheck } from "lucide-react";

interface FilesViewerProps {
  modifiedFiles: string[];
}

interface FileEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  status?: "modified" | "created" | "scanned";
  additions?: number;
  deletions?: number;
}

export function FilesViewer({ modifiedFiles }: FilesViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string>("src/api/webhook.ts");

  const repoFiles: FileEntry[] = [
    {
      path: "src/api/webhook.ts",
      name: "webhook.ts",
      type: "file",
      status: modifiedFiles.includes("src/api/webhook.ts") ? "modified" : undefined,
      additions: 32,
      deletions: 9,
    },
    {
      path: "src/config/stripe.ts",
      name: "stripe.ts",
      type: "file",
      status: modifiedFiles.includes("src/config/stripe.ts") ? "modified" : undefined,
      additions: 10,
      deletions: 2,
    },
    {
      path: "tests/webhook_concurrency.test.ts",
      name: "webhook_concurrency.test.ts",
      type: "file",
      status: "scanned",
      additions: 0,
      deletions: 0,
    },
    {
      path: "package.json",
      name: "package.json",
      type: "file",
      status: undefined,
    },
    {
      path: "README.md",
      name: "README.md",
      type: "file",
      status: undefined,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-mono text-xs">
      {/* Files Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-300">
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-zinc-200">Repository Files</span>
        </div>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
          {modifiedFiles.length} modified
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1">
          Working Tree
        </div>

        {repoFiles.map((f) => {
          const isSelected = selectedFile === f.path;
          const isModified = f.status === "modified";

          return (
            <div
              key={f.path}
              onClick={() => setSelectedFile(f.path)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                isSelected
                  ? "bg-zinc-800/80 border-zinc-700 text-white"
                  : "bg-zinc-900/40 border-transparent hover:bg-zinc-900 hover:text-zinc-200 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileCode
                  className={`w-4 h-4 shrink-0 ${
                    isModified ? "text-rose-400" : "text-zinc-500"
                  }`}
                />
                <span className="truncate">{f.path}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isModified && (
                  <span className="rounded bg-rose-950/80 border border-rose-800/80 px-1.5 py-0.5 text-[10px] text-rose-400 font-semibold uppercase">
                    Modified (+{f.additions} -{f.deletions})
                  </span>
                )}
                {f.status === "scanned" && (
                  <span className="rounded bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 text-[10px] text-emerald-400 font-semibold">
                    Verified
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected File Details Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">
          Selected Target:
        </div>
        <div className="text-xs text-zinc-200 font-mono flex items-center justify-between">
          <span>{selectedFile}</span>
          <span className="text-[10px] text-emerald-400">Git tracked</span>
        </div>
      </div>
    </div>
  );
}
