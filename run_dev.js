#!/usr/bin/env node

/**
 * Unified DevPilot Runner
 * Launches both FastAPI backend (port 8000) and Next.js frontend (port 3000)
 * in parallel with a single command, auto port-conflict resolution, formatted output,
 * and unified graceful shutdown.
 */

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

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

// 1. Automatically detect & free any lingering processes occupying ports 8000 and 3000
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const lines = output.trim().split("\n");
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== "0" && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
          console.log(`${colors.yellow}• Freeing occupied port ${port} (terminated stale PID ${pid})${colors.reset}`);
        } catch (e) {}
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
      });
    }
  } catch (e) {
    // Port was already free
  }
}

freePort(8000);
freePort(3000);

// 2. Preflight checks
const nextBin = path.join(frontendDir, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.error(`${colors.red}Frontend dependencies are missing. Run: npm --prefix member3_frontend install${colors.reset}`);
  process.exit(1);
}

try {
  execSync('python -c "import fastapi, uvicorn, websockets"', { cwd: rootDir, stdio: "ignore" });
} catch (e) {
  console.error(`${colors.red}Backend dependencies are missing (or 'python' is not on PATH). Run: pip install -r requirements.txt${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.cyan}• Backend:${colors.reset}  http://127.0.0.1:8000 (FastAPI + WebSockets)`);
console.log(`${colors.magenta}• Frontend:${colors.reset} http://localhost:3000 (Next.js War Room Cockpit)`);
console.log(`${colors.yellow}Press Ctrl+C to terminate both servers.${colors.reset}\n`);

let isShuttingDown = false;

function prefixStream(stream, prefix, color) {
  if (!stream) return;
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

// 3. Launch FastAPI Backend
const backendCmd = "python";
const backendArgs = ["-m", "uvicorn", "member4_server.main:app", "--host", "127.0.0.1", "--port", "8000"];

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
    shutdown();
  }
});

// 4. Launch Next.js Frontend directly through node binary (avoids Windows cmd EINVAL)
const frontendArgs = [nextBin, "dev"];

const frontendProcess = spawn(process.execPath, frontendArgs, {
  cwd: frontendDir,
  shell: false,
  env: { ...process.env, PORT: "3000" },
});

prefixStream(frontendProcess.stdout, "[FRONTEND]", colors.magenta);
prefixStream(frontendProcess.stderr, "[FRONTEND]", colors.magenta);

frontendProcess.on("exit", (code) => {
  if (!isShuttingDown) {
    console.log(`${colors.red}[FRONTEND] Process exited with code ${code}${colors.reset}`);
    shutdown();
  }
});

// 5. Handle termination signals cleanly
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${colors.yellow}Shutting down DevPilot servers...${colors.reset}`);
  killProcess(backendProcess);
  killProcess(frontendProcess);
  freePort(8000);
  freePort(3000);
  setTimeout(() => process.exit(0), 400);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep the Node event loop alive
if (process.stdin.isTTY) {
  process.stdin.resume();
} else {
  setInterval(() => {}, 10000);
}
