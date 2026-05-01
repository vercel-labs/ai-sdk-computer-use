/**
 * One-time script to create a Vercel Sandbox snapshot with a full desktop environment.
 *
 * Run with: npx tsx lib/sandbox/create-snapshot.ts
 *
 * Prerequisites:
 *   - VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID environment variables set
 *     OR run `vercel link && vercel env pull` for OIDC auth
 *
 * After running, set the output snapshot ID as SANDBOX_SNAPSHOT_ID in your .env
 */

import { Sandbox } from "@vercel/sandbox";

const STARTUP_SCRIPT = `#!/bin/bash
set -e

# Read resolution from env or default
RESOLUTION=\${RESOLUTION:-1024x768}

# Use Xvnc (TigerVNC) as combined X server + VNC server
Xvnc :99 -geometry $RESOLUTION -depth 24 -SecurityTypes None -AlwaysShared -rfbport 5900 &
sleep 1

export DISPLAY=:99

# Set a desktop background color
# NOTE: ctypes.util is not available on AL2023, so load libX11.so.6 directly
python3 -c "
import ctypes
lib = ctypes.cdll.LoadLibrary('libX11.so.6')
d = lib.XOpenDisplay(None)
s = lib.XDefaultScreen(d)
r = lib.XRootWindow(d, s)
lib.XSetWindowBackground(d, r, 0x2D2D2D)
lib.XClearWindow(d, r)
lib.XFlush(d)
lib.XCloseDisplay(d)
" 2>/dev/null || true

# Start window manager (required for Chrome and proper window rendering)
openbox &
sleep 0.5

# Start noVNC websockify proxy (port 6080 -> VNC port 5900)
websockify --web /usr/share/novnc 6080 localhost:5900 &

echo "Desktop environment started"
`;

async function run(
  sandbox: Sandbox,
  description: string,
  cmd: string,
  args: string[],
  sudo = true,
) {
  console.log(description);
  const result = await sandbox.runCommand({ cmd, args, sudo });
  if (result.exitCode !== 0) {
    const stderr = await result.stderr();
    console.error(`  FAILED (exit ${result.exitCode}): ${stderr}`);
    throw new Error(`${description} failed`);
  }
  console.log(`  OK (exit ${result.exitCode})`);
  return result;
}

async function createSnapshot() {
  console.log("Creating sandbox...");
  const sandbox = await Sandbox.create({
    timeout: 600000, // 10 minutes for setup
  });
  console.log(`Sandbox created: ${sandbox.sandboxId}`);

  // Step 1: Install packages available in AL2023 core repos
  await run(
    sandbox,
    "Installing system packages (tigervnc, ImageMagick, build deps, Chrome deps)...",
    "dnf",
    [
      "install",
      "-y",
      "tigervnc-server",
      "ImageMagick",
      "python3-pip",
      "gcc",
      "make",
      // xdotool build deps
      "libXtst-devel",
      "libXinerama-devel",
      "libxkbcommon-devel",
      "libX11-devel",
      // Chrome deps
      "libXcomposite",
      "libXdamage",
      "libXrandr",
      "libxkbcommon",
      "pango",
      "alsa-lib",
      "atk",
      "at-spi2-atk",
      "cups-libs",
      "libdrm",
      "mesa-libgbm",
      "fontconfig",
      "dejavu-sans-fonts",
      "liberation-fonts",
      // openbox window manager build deps
      "glib2-devel",
      "libxml2-devel",
      "pango-devel",
      "libXrandr-devel",
      "libXcursor-devel",
      "libXft-devel",
      "libXext-devel",
      "pkgconf",
    ],
  );

  // Step 2: Install Google Chrome
  await run(
    sandbox,
    "Installing Google Chrome...",
    "dnf",
    [
      "install",
      "-y",
      "https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm",
    ],
  );

  // Step 3: Build xdotool from source
  console.log("Building xdotool from source...");
  await run(sandbox, "  Downloading xdotool...", "bash", [
    "-c",
    "cd /tmp && curl -L https://github.com/jordansissel/xdotool/releases/download/v3.20211022.1/xdotool-3.20211022.1.tar.gz -o xdotool.tar.gz && tar xzf xdotool.tar.gz",
  ]);
  await run(sandbox, "  Compiling xdotool...", "bash", [
    "-c",
    "cd /tmp/xdotool-3.20211022.1 && make WITHOUT_RPATH_FIX=1 && make PREFIX=/usr INSTALLMAN=/usr/share/man install",
  ]);

  // Step 4: Build openbox from source (window manager)
  console.log("Building openbox from source...");
  await run(sandbox, "  Downloading openbox...", "bash", [
    "-c",
    "cd /tmp && curl -L http://openbox.org/dist/openbox/openbox-3.6.1.tar.gz -o openbox.tar.gz && tar xzf openbox.tar.gz",
  ]);
  await run(sandbox, "  Compiling openbox...", "bash", [
    "-c",
    "cd /tmp/openbox-3.6.1 && ./configure --prefix=/usr --disable-nls && make -j$(nproc) && make install && ldconfig",
  ]);

  // Step 5: Install websockify via pip
  await run(
    sandbox,
    "Installing websockify...",
    "pip3",
    ["install", "websockify"],
  );

  // Step 6: Install noVNC
  await run(sandbox, "Installing noVNC...", "bash", [
    "-c",
    "git clone https://github.com/novnc/noVNC.git /usr/share/novnc && ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html",
  ]);

  // Step 7: Write startup script (write to sandbox dir first, then sudo mv)
  console.log("Writing startup script...");
  await sandbox.writeFiles([
    {
      path: "start-desktop.sh",
      content: Buffer.from(STARTUP_SCRIPT),
    },
  ]);
  await run(sandbox, "  Moving startup script...", "bash", [
    "-c",
    "mv /vercel/sandbox/start-desktop.sh /usr/local/bin/start-desktop.sh && chmod +x /usr/local/bin/start-desktop.sh",
  ]);

  // Take snapshot (this automatically stops the sandbox)
  console.log("Taking snapshot...");
  const snapshot = await sandbox.snapshot();

  console.log("\n========================================");
  console.log(`Snapshot ID: ${snapshot.snapshotId}`);
  console.log("========================================\n");
  console.log("Add this to your .env:");
  console.log(`SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);
}

createSnapshot().catch((err) => {
  console.error("Failed to create snapshot:", err);
  process.exit(1);
});
