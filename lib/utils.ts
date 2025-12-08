import { UIMessage } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ABORTED = "User aborted";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

export const prunedMessages = (messages: UIMessage[]): UIMessage[] => {
  if (messages.at(-1)?.role === "assistant") {
    return messages;
  }

  return messages.map((message) => {
    // check if last message part is a tool invocation in a call state, then append a part with the tool result
    message.parts = message.parts.map((part) => {
      if (part.type === "tool-invocation") {
        if (
          part.toolInvocation.toolName === "computer" &&
          part.toolInvocation.args.action === "screenshot"
        ) {
          return {
            ...part,
            toolInvocation: {
              ...part.toolInvocation,
              result: {
                type: "text",
                text: "Image redacted to save input tokens",
              },
            },
          };
        }
        return part;
      }
      return part;
    });
    return message;
  });
};
