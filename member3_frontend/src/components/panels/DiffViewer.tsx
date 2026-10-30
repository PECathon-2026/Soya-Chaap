"use client";

import React, { useEffect, useState } from "react";
import { FileCode, Plus, Minus, Copy, Check } from "lucide-react";

interface DiffViewerProps {
  missionId?: string;
  diff?: string;
}

interface DiffFile {
  oldPath: string;
  newPath: string;
  lines: {
    type: "add" | "del" | "context" | "header" | "meta";
    content: string;
    oldLine?: number;
    newLine?: number;
  }[];
}

export function DiffViewer({ missionId = "mission_001", diff }: DiffViewerProps) {
  const [diffText, setDiffText] = useState<string>(diff || "");
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (diff !== undefined && diff !== null && diff.trim()) {
      setDiffText(diff);
      parseDiff(diff);
      return;
    }
    fetch(`/runs/${missionId}/changes.diff`)
      .then((res) => (res.ok ? res.text() : ""))
      .then((raw) => {
        setDiffText(raw);
        parseDiff(raw);
      })
      .catch((err) => console.error("Error loading diff:", err));
  }, [missionId, diff]);

  const parseDiff = (raw: string) => {
    if (!raw || !raw.trim()) {
      setFiles([]);
      return;
    }

    let normalizedRaw = raw;
    if (!normalizedRaw.includes("diff --git ") && normalizedRaw.includes("--- ")) {
      normalizedRaw = "diff --git a/file b/file\n" + normalizedRaw;
    }

    const rawFiles = normalizedRaw.split(/^diff --git /m).filter(Boolean);
    const parsedFiles: DiffFile[] = [];

    for (const fileRaw of rawFiles) {
      const lines = fileRaw.split("\n");
      let oldPath = "";
      let newPath = "";
      const diffLines: DiffFile["lines"] = [];
      let oldLineNum = 1;
      let newLineNum = 1;

      for (const line of lines) {
        if (line.startsWith("--- a/")) {
          oldPath = line.replace("--- a/", "");
          continue;
        }
        if (line.startsWith("+++ b/")) {
          newPath = line.replace("+++ b/", "");
          continue;
        }
        if (line.startsWith("@@")) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (match) {
            oldLineNum = parseInt(match[1], 10);
            newLineNum = parseInt(match[2], 10);
          }
          diffLines.push({ type: "header", content: line });
          continue;
        }
        if (line.startsWith("+")) {
          diffLines.push({
            type: "add",
            content: line.slice(1),
            newLine: newLineNum++,
          });
        } else if (line.startsWith("-")) {
          diffLines.push({
            type: "del",
            content: line.slice(1),
            oldLine: oldLineNum++,
          });
        } else if (line.startsWith("index ") || line.startsWith("new file ") || line.startsWith("deleted file ")) {
          diffLines.push({ type: "meta", content: line });
        } else {
          diffLines.push({
            type: "context",
            content: line.startsWith(" ") ? line.slice(1) : line,
            oldLine: oldLineNum++,
            newLine: newLineNum++,
          });
        }
      }

      parsedFiles.push({
        oldPath: oldPath || newPath,
        newPath: newPath || oldPath,
        lines: diffLines,
      });
    }

    setFiles(parsedFiles);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-mono text-xs">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-300">
          <FileCode className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-zinc-200">Unified Diff</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Raw</span>
            </>
          )}
        </button>
      </div>

      {/* Diff Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {files.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">Loading diff changes...</div>
        ) : (
          files.map((file, fIdx) => (
            <div
              key={fIdx}
              className="rounded-xl border border-zinc-800 bg-black/60 overflow-hidden"
            >
              {/* File Title Bar */}
              <div className="flex items-center justify-between bg-zinc-900/90 px-3 py-2 border-b border-zinc-800 text-[11px]">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                  <span className="text-zinc-500">b/</span>
                  <span>{file.newPath}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-emerald-400 flex items-center">
                    <Plus className="w-3 h-3" />
                    {file.lines.filter((l) => l.type === "add").length}
                  </span>
                  <span className="text-rose-400 flex items-center">
                    <Minus className="w-3 h-3" />
                    {file.lines.filter((l) => l.type === "del").length}
                  </span>
                </div>
              </div>

              {/* Diff Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-[11px]">
                  <tbody>
                    {file.lines.map((line, lIdx) => {
                      if (line.type === "header") {
                        return (
                          <tr key={lIdx} className="bg-amber-950/20 text-amber-400/90">
                            <td className="px-2 py-1 select-none text-zinc-600 w-8 text-right text-[10px]">...</td>
                            <td className="px-2 py-1 select-none text-zinc-600 w-8 text-right text-[10px]">...</td>
                            <td className="px-3 py-1 font-semibold">{line.content}</td>
                          </tr>
                        );
                      }
                      if (line.type === "meta") {
                        return null;
                      }

                      const isAdd = line.type === "add";
                      const isDel = line.type === "del";

                      return (
                        <tr
                          key={lIdx}
                          className={
                            isAdd
                              ? "bg-emerald-950/30 text-emerald-300"
                              : isDel
                                ? "bg-rose-950/30 text-rose-300"
                                : "text-zinc-400 hover:bg-zinc-900/30"
                          }
                        >
                          <td className="px-2 py-0.5 select-none text-zinc-600 w-8 text-right text-[10px] border-r border-zinc-800/40">
                            {line.oldLine ?? ""}
                          </td>
                          <td className="px-2 py-0.5 select-none text-zinc-600 w-8 text-right text-[10px] border-r border-zinc-800/40">
                            {line.newLine ?? ""}
                          </td>
                          <td className="px-3 py-0.5 whitespace-pre font-mono leading-tight">
                            <span className="inline-block w-4 select-none opacity-60">
                              {isAdd ? "+" : isDel ? "-" : " "}
                            </span>
                            {line.content}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
