import { killDesktop } from "@/lib/sandbox/utils";
import { killBrowser } from "@/lib/kernel/utils";

// Default provider can be set via environment variable
const DEFAULT_PROVIDER =
  process.env.NEXT_PUBLIC_COMPUTER_USE_PROVIDER || "kernel";

// Common handler for both GET and POST requests
async function handleKillDesktop(request: Request) {
  // Enable CORS to ensure this works across all browsers

  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get("sandboxId");
  const provider = searchParams.get("provider") || DEFAULT_PROVIDER;

  console.log(
    `Kill desktop request received via ${request.method} for ID: ${sandboxId} (provider: ${provider})`,
  );

  if (!sandboxId) {
    return new Response("No sandboxId provided", { status: 400 });
  }

  try {
    if (provider === "kernel") {
      await killBrowser(sandboxId);
    } else {
      await killDesktop(sandboxId);
    }
    return new Response("Desktop killed successfully", { status: 200 });
  } catch (error) {
    console.error(`Failed to kill desktop with ID: ${sandboxId}`, error);
    return new Response("Failed to kill desktop", { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: Request) {
  return handleKillDesktop(request);
}
