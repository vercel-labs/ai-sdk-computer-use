import { anthropic } from "@ai-sdk/anthropic";
import { streamText, UIMessage } from "ai";
import { killDesktop } from "@/lib/sandbox/utils";
import {
  bashTool as sandboxBashTool,
  computerTool as sandboxComputerTool,
} from "@/lib/sandbox/tool";
import { killBrowser } from "@/lib/kernel/utils";
import {
  bashTool as kernelBashTool,
  computerTool as kernelComputerTool,
} from "@/lib/kernel/tool";
import { prunedMessages } from "@/lib/utils";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

// Default provider can be set via environment variable
const DEFAULT_PROVIDER = (process.env.NEXT_PUBLIC_COMPUTER_USE_PROVIDER ||
  "kernel") as "sandbox" | "kernel";

export async function POST(req: Request) {
  const {
    messages,
    sandboxId,
    provider: rawProvider,
  }: {
    messages: UIMessage[];
    sandboxId: string;
    provider?: "sandbox" | "kernel";
  } = await req.json();

  const provider: "sandbox" | "kernel" = rawProvider || DEFAULT_PROVIDER;
  const useKernel = provider === "kernel";
  const computerTool = useKernel ? kernelComputerTool : sandboxComputerTool;
  const bashTool = useKernel ? kernelBashTool : sandboxBashTool;

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"), // Using Sonnet for computer use
      system:
        "You are a helpful assistant with access to a computer. " +
        "Use the computer tool to help the user with their requests. " +
        "Use the bash tool to execute commands on the computer. You can create files and folders using the bash tool. Always prefer the bash tool where it is viable for the task. " +
        "Be sure to advise the user when waiting is necessary. " +
        "If the browser opens with a setup wizard, YOU MUST IGNORE IT and move straight to the next step (e.g. input the url in the search bar).",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });

    // Create response stream
    const response = result.toDataStreamResponse({
      // @ts-expect-error eheljfe
      getErrorMessage(error) {
        console.error(error);
        return error;
      },
    });

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    // Force cleanup on error based on provider
    if (useKernel) {
      await killBrowser(sandboxId);
    } else {
      await killDesktop(sandboxId);
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
