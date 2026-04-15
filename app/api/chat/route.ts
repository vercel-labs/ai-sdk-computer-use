import { google } from "@ai-sdk/google";
import { streamText, UIMessage } from "ai";
import { killDesktop } from "@/lib/sandbox/utils";
import { bashTool, computerTool } from "@/lib/sandbox/tool";
import { prunedMessages } from "@/lib/utils";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, sandboxId }: { messages: UIMessage[]; sandboxId: string } =
    await req.json();
  try {
    const result = streamText({
      model: google("gemini-2.5-flash"), // Using Gemini 2.5 Flash for tool calling
      system:
        "You are a helpful assistant with access to a computer. " +
        "Use the computer tool to help the user with their requests. " +
        "Use the bash tool to execute commands on the computer. You can create files and folders using the bash tool. Always prefer the bash tool where it is viable for the task. " +
        "Be sure to advise the user when waiting is necessary. " +
        "If the browser opens with a setup wizard, YOU MUST IGNORE IT and move straight to the next step (e.g. input the url in the search bar). " +
        "Always start by taking a screenshot to understand the current state of the screen before performing any action.",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      maxSteps: 50,
    });

    // Create response stream
    const response = result.toDataStreamResponse({
      getErrorMessage(error) {
        console.error(error);
        return error instanceof Error ? error.message : String(error);
      },
    });

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    await killDesktop(sandboxId); // Force cleanup on error
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
