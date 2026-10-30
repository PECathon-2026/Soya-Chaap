#!/usr/bin/env node

/**
 * Unified DevPilot Runner
 * Launches both FastAPI backend (port 8000) and Next.js frontend (port 3000)
 * in parallel with a single command, formatted output, and unified graceful shutdown.
 */

const { spawn, execSync } = require("child_process");
const path = require("path");

// Determine workspace root regardless of where this script was executed from
let rootDir = __dirname;
if (path.basename(rootDir) === "member3_frontend") {
  rootDir = path.resolve(rootDir, "..");
}
const frontendDir = path.join(rootDir, "member3_frontend");

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

console.log(`${colors.bold}${colors.green}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.green}  ⚔️  DEVPILOT UNIFIED RUNNER (BACKEND + FRONTEND)  ⚔️${colors.reset}`);
console.log(`${colors.bold}${colors.green}======================================================${colors.reset}`);
console.log(`${colors.cyan}• Backend:${colors.reset}  http://127.0.0.1:8000 (FastAPI + WebSockets)`);
console.log(`${colors.magenta}• Frontend:${colors.reset} http://localhost:3000 (Next.js War Room Cockpit)`);
console.log(`${colors.yellow}Press Ctrl+C to terminate both servers.${colors.reset}\n`);

let isShuttingDown = false;

function prefixStream(stream, prefix, color) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep last incomplete line
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${prefix}${colors.reset} ${line}`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) {
      console.log(`${color}${prefix}${colors.reset} ${buffer}`);
    }
  });
}

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } else {
      proc.kill("SIGTERM");
    }
  } catch (e) {
    // Process might already be closed
  }
}

// 1. Launch FastAPI Backend
const backendCmd = "python";
const backendArgs = ["-m", "uvicorn", "member4_server.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"];

const backendProcess = spawn(backendCmd, backendArgs, {
  cwd: rootDir,
  shell: false,
  env: { ...process.env, PYTHONUNBUFFERED: "1" },
});

prefixStream(backendProcess.stdout, "[BACKEND]", colors.cyan);
prefixStream(backendProcess.stderr, "[BACKEND]", colors.cyan);

backendProcess.on("exit", (code) => {
  if (!isShuttingDown) {
    console.log(`${colors.red}[BACKEND] Process exited with code ${code}${colors.reset}`);
  }
});

// 2. Launch Next.js Frontend
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const frontendArgs = ["run", "dev:frontend"];

const frontendProcess = spawn(npmCmd, frontendArgs, {
  cwd: frontendDir,
  shell: false,
  env: { ...process.env, PORT: "3000" },
});

prefixStream(frontendProcess.stdout, "[FRONTEND]", colors.magenta);
prefixStream(frontendProcess.stderr, "[FRONTEND]", colors.magenta);

frontendProcess.on("exit", (code) => {
  if (!isShuttingDown) {
    console.log(`${colors.red}[FRONTEND] Process exited with code ${code}${colors.reset}`);
  }
});

// Handle termination signals
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${colors.yellow}Shutting down DevPilot servers...${colors.reset}`);
  killProcess(backendProcess);
  killProcess(frontendProcess);
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
