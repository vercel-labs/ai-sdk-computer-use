"use server";

import { Sandbox } from "@vercel/sandbox";
import { resolution } from "./tool";

const NOVNC_PORT = 6080;
const DISPLAY_ENV = { DISPLAY: ":99" };

export const getDesktop = async (id?: string) => {
  try {
    if (id) {
      const sandbox = await Sandbox.get({ sandboxId: id });
      if (sandbox.status === "running") {
        return sandbox;
      }
    }

    const sandbox = await Sandbox.create({
      source: {
        type: "snapshot",
        snapshotId: process.env.SANDBOX_SNAPSHOT_ID!,
      },
      timeout: 300000,
      ports: [NOVNC_PORT],
    });

    // Start the desktop environment
    await sandbox.runCommand({
      cmd: "bash",
      args: ["/usr/local/bin/start-desktop.sh"],
      env: {
        RESOLUTION: `${resolution.x}x${resolution.y}`,
      },
      detached: true,
    });

    // Wait for noVNC to be ready
    await waitForNoVNC(sandbox);

    // Set background color (ctypes.util is missing on AL2023, load libX11 directly)
    await sandbox.runCommand({
      cmd: "python3",
      args: [
        "-c",
        `import ctypes
lib = ctypes.cdll.LoadLibrary('libX11.so.6')
d = lib.XOpenDisplay(None)
s = lib.XDefaultScreen(d)
r = lib.XRootWindow(d, s)
lib.XSetWindowBackground(d, r, 0x2D2D2D)
lib.XClearWindow(d, r)
lib.XFlush(d)
lib.XCloseDisplay(d)`,
      ],
      env: DISPLAY_ENV,
    });

    // Launch Chrome so the AI has a browser to work with immediately
    await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        "google-chrome --no-sandbox --disable-gpu --no-first-run --disable-dev-shm-usage --start-maximized 'about:blank' &",
      ],
      env: DISPLAY_ENV,
      detached: true,
    });

    return sandbox;
  } catch (error) {
    console.error("Error in getDesktop:", error);
    throw error;
  }
};

async function waitForNoVNC(sandbox: Sandbox, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: [
          "-c",
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${NOVNC_PORT}`,
        ],
      });
      const statusCode = await result.stdout();
      if (statusCode.trim() === "200") {
        return;
      }
    } catch {
      // noVNC not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.warn("noVNC health check timed out, proceeding anyway");
}

export const getDesktopURL = async (id?: string) => {
  try {
    const sandbox = await getDesktop(id);
    const baseUrl = sandbox.domain(NOVNC_PORT);
    const streamUrl = `${baseUrl}/vnc.html?autoconnect=true&resize=scale&reconnect=true`;

    return { streamUrl, id: sandbox.sandboxId };
  } catch (error) {
    console.error("Error in getDesktopURL:", error);
    throw error;
  }
};

export const killDesktop = async (id: string) => {
  try {
    const sandbox = await Sandbox.get({ sandboxId: id });
    await sandbox.stop();
  } catch (error) {
    console.error("Error killing desktop:", error);
  }
};
