Author: Ahmed Mosaad Mohammed

# AI Agent Dashboard

A production-quality AI Agent Dashboard built on top of the [ai-sdk-computer-use](https://github.com/vercel-labs/ai-sdk-computer-use) demo by Vercel.

## 🔗 Links

- **Live Demo:** https://ai-sdk-computer-use-lyart-sigma.vercel.app/
- **Demo Video:** https://drive.google.com/file/d/1sbAhvuy78ZKSHVzCizBmUHn1najGfBwt/view?usp=sharing

## Features

- **Two-panel layout** — Chat on the left, VNC viewer on the right, horizontally resizable
- **Tool call visualizations** — Inline cards in chat showing screenshot, click, type, scroll, bash actions with status and duration
- **Event pipeline** — Typed Zustand store capturing all tool calls with id, timestamp, type, payload, status, duration
- **Debug panel** — Collapsible panel showing full event store and event counts per action type
- **Chat sessions** — Create, switch, and delete sessions with localStorage persistence
- **Memoized VNC** — VNC component does not re-render on chat updates

## Tech Stack

- Next.js App Router
- AI SDK by Vercel
- Anthropic Claude Sonnet
- Zustand (typed state management)
- Vercel Sandboxes (VNC desktop)
- shadcn/ui + Tailwind CSS

## Setup

1. Clone the repo
2. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`
3. Set up environment variables in `.env.local`:
   \`\`\`
   ANTHROPIC_API_KEY=sk-ant-...
   SANDBOX_SNAPSHOT_ID=snap_...
   VERCEL_OIDC_TOKEN=...
   \`\`\`
4. Run dev server:
   \`\`\`bash
   pnpm dev
   \`\`\`

## Key Technical Decisions

- **Zustand** for event store — lightweight, TypeScript-friendly, no boilerplate
- **React.memo** on VNC component — prevents re-renders when chat updates
- **Discriminated unions** for tool call types — no `any` types anywhere
- **localStorage persist** middleware for chat sessions