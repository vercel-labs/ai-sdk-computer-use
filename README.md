<a href="https://ai-sdk-computer-use.vercel.app">
  <h1 align="center">AI SDK Computer Use Demo</h1>
</a>

<p align="center">
  An open-source AI chatbot demonstrating computer use capabilities with Anthropic Claude Sonnet 4.5, Vercel Sandboxes, and the AI SDK by Vercel.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#how-it-works"><strong>How It Works</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#environment-variables"><strong>Environment Variables</strong></a>
</p>
<br/>

## Features

- Streaming text responses powered by the [AI SDK](https://sdk.vercel.ai/docs).
- Anthropic Claude Sonnet 4.5 with [computer use](https://sdk.vercel.ai/docs/guides/computer-use) and bash tool capabilities.
- Pluggable execution providers: [Kernel](https://onkernel.com) cloud browsers (default) or a remote desktop in a [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).
- [shadcn/ui](https://ui.shadcn.com/) components for a modern, responsive UI powered by [Tailwind CSS](https://tailwindcss.com).
- Built with the latest [Next.js](https://nextjs.org) App Router.

## How It Works

The app spins up a Vercel Sandbox from a pre-built snapshot that includes:

- **Xvnc** — a virtual X11 display server
- **openbox** — a lightweight window manager
- **noVNC + websockify** — streams the desktop to the browser via WebSocket
- **Google Chrome** — auto-launched so the AI agent has a browser ready
- **xdotool + ImageMagick** — for mouse/keyboard control and screenshots

When a user sends a message, Claude uses the `computer` tool (screenshot, click, type, scroll) and the `bash` tool (run shell commands) to interact with the sandbox desktop. The noVNC stream is displayed in a resizable iframe alongside the chat.

### Architecture

```
User ↔ Next.js Chat UI ↔ AI SDK ↔ Claude Sonnet 4.5
                                        ↓
                                  Vercel Sandbox
                              ┌─────────────────────┐
                              │  Xvnc (:99)         │
                              │  openbox             │
                              │  Chrome              │
                              │  websockify → noVNC  │
                              └─────────────────────┘
                                        ↓
                              noVNC iframe in browser
```

## Deploy Your Own

You can deploy your own version to Vercel by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=AI+SDK+Computer+Use+Demo&repository-name=ai-sdk-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-computer-use&demo-title=AI+SDK+Computer+Use+Demo&demo-url=https%3A%2F%2Fai-sdk-computer-use.vercel.app%2F&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Anthropic+Claude+Sonnet+4.5+computer+use+capabilities&env=ANTHROPIC_API_KEY,KERNEL_API_KEY,SANDBOX_SNAPSHOT_ID)

## Running Locally

### Prerequisites

- Node.js 18+
- A [Vercel](https://vercel.com) account (for Sandbox access)
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Vercel credentials

Install the [Vercel CLI](https://vercel.com/docs/cli) and link your project:

```bash
pnpm install -g vercel
vercel link
vercel env pull
```

This creates a `.env.local` file with `VERCEL_OIDC_TOKEN` for Sandbox authentication.

Alternatively, set `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID` manually in your `.env.local`.

### 3. Create a sandbox snapshot

The snapshot pre-installs the desktop environment (Xvnc, Chrome, openbox, noVNC, xdotool, ImageMagick) so sandboxes boot in seconds.

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

This takes ~10 minutes. When done, it outputs a snapshot ID. Add it to your `.env.local`:

```
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxx
```

### 4. Add your Anthropic API key

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the computer use agent.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `NEXT_PUBLIC_COMPUTER_USE_PROVIDER` | No | Provider to use: `kernel` (default) or `sandbox` |
| `KERNEL_API_KEY` | Kernel | Kernel API key — required when using the Kernel provider |
| `SANDBOX_SNAPSHOT_ID` | Sandbox | Vercel Sandbox snapshot ID — required when using the Sandbox provider |
| `VERCEL_OIDC_TOKEN` | Sandbox* | Auto-set by `vercel env pull` for Sandbox auth |
| `VERCEL_TOKEN` | Sandbox* | Alternative to OIDC — a Vercel personal access token |
| `VERCEL_TEAM_ID` | Sandbox* | Required with `VERCEL_TOKEN` |
| `VERCEL_PROJECT_ID` | Sandbox* | Required with `VERCEL_TOKEN` |

\* When using the Sandbox provider, either `VERCEL_OIDC_TOKEN` (via `vercel env pull`) or the `VERCEL_TOKEN` + team/project IDs are required for Sandbox authentication.
