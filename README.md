Author: Anas Mansy

# AI Agent Dashboard

## Overview

This repository is an in-place refactor of the Vercel `ai-sdk-computer-use` demo into a more dashboard-oriented AI agent interface. It keeps the original core flow intact:

- Next.js App Router frontend
- AI SDK streaming chat
- Anthropic computer-use + bash tools
- Vercel Sandbox desktop runtime
- noVNC streaming into the UI

On top of that baseline, the current codebase adds a production-style dashboard shell and a typed client-side event pipeline for inspecting agent and tool activity.

## Feature Summary

### Implemented

- Two-panel dashboard layout with a draggable horizontal resizer
- Live VNC desktop on the right side
- Chat workspace on the left side
- Typed client-side event pipeline using discriminated unions
- Inline tool activity cards derived from real tool invocations/results
- Collapsible debug panel with live event counts and timeline
- Tool details panel driven by selected event/tool activity
- Memoized VNC viewer boundary to avoid unnecessary iframe remounts
- Graceful AI SDK stream error serialization in the chat API route
- Fullscreen permission support for the embedded noVNC iframe

### Not Implemented In The Checked-In Code

- Multi-session history
- localStorage-backed session persistence
- Server-side persistence or collaboration

The README is intentionally aligned to what is actually present in this repository today.

## Architecture

```text
User
  ↓
Next.js App Router UI
  ├─ Dashboard shell
  │   ├─ Chat panel
  │   ├─ Inline tool activity
  │   ├─ Debug panel
  │   └─ Tool details panel
  ├─ useChat() streaming state
  └─ useAgentEvents() normalized event state
          ↓
    /api/chat
      ↓
  AI SDK streamText()
      ↓
  Anthropic Claude Sonnet + computer/bash tools
      ↓
  Vercel Sandbox
      ├─ Xvnc
      ├─ openbox
      ├─ Chrome
      ├─ websockify / noVNC
      ├─ xdotool
      └─ ImageMagick
```

## Project Structure

```text
app/
  api/chat/route.ts
  api/kill-desktop/route.ts
  layout.tsx
  page.tsx

components/dashboard/
  dashboard-layout.tsx
  chat-panel.tsx
  debug-panel.tsx
  inline-tool-card.tsx
  panel-resizer.tsx
  tool-details-panel.tsx
  vnc-panel.tsx

hooks/
  use-agent-events.ts

lib/agent-events/
  normalize.ts
  selectors.ts

lib/sandbox/
  create-snapshot.ts
  tool.ts
  utils.ts

types/
  agent-events.ts
```

## Key Technical Decisions

### 1. Refactor In Place, Not Rewrite

The existing Vercel demo route, API shape, and sandbox utilities were preserved. The work focused on UI composition and client-side state layers rather than replacing the original computer-use flow.

### 2. Typed Event Pipeline Over Raw Message Parsing In Components

The UI no longer depends on ad hoc tool parsing in multiple places. Instead:

- raw `useChat()` messages are normalized into typed events
- derived selectors compute tool summaries and debug state
- presentation components consume already-shaped data

This keeps rendering code simpler and makes later session persistence easier.

### 3. VNC Isolation As A First-Class Boundary

The noVNC iframe is wrapped in a memoized viewer boundary in [`components/dashboard/vnc-panel.tsx`](./components/dashboard/vnc-panel.tsx). The goal is to keep chat/event churn from remounting the live desktop.

### 4. Keep Sandbox Lifecycle Separate From UI State

The desktop lifecycle still lives in [`app/page.tsx`](./app/page.tsx) and [`lib/sandbox/utils.ts`](./lib/sandbox/utils.ts). The dashboard and event pipeline do not own sandbox creation/teardown.

## Event Pipeline

The event system is defined in [`types/agent-events.ts`](./types/agent-events.ts) and uses discriminated unions.

### Event Types

- `tool_call`
- `tool_result`
- `agent_status`
- `message_user`
- `message_agent`
- `system`

### Event Shape

Each event includes:

- `id`
- `timestamp`
- `type`
- `status`
- `payload`
- `durationMs?`

### Data Flow

1. `useChat()` produces raw AI SDK messages.
2. [`hooks/use-agent-events.ts`](./hooks/use-agent-events.ts) reconciles those messages into a persistent client-side event list.
3. [`lib/agent-events/normalize.ts`](./lib/agent-events/normalize.ts) converts tool invocations/results and message state into normalized events.
4. [`lib/agent-events/selectors.ts`](./lib/agent-events/selectors.ts) derives:
   - counts by event type
   - counts by tool action type
   - current agent status
   - latest event
   - selected event
   - grouped tool activities
5. Dashboard components render from the derived state instead of parsing raw message structures repeatedly.

### Why This Matters

This gives the UI:

- a stable inspection layer for debugging
- clearer separation between transport state and display state
- a foundation for future session persistence or replay

## Session Persistence

Multi-session persistence is **not implemented in the checked-in code**.

Current behavior:

- the active conversation lives in client memory through `useChat()`
- normalized event state also lives in client memory
- refreshing the page clears the conversation and event history

If I were extending this next, the correct place would be a dedicated session store hook layered above `useChat()` and `useAgentEvents()`, not inside the VNC or sandbox state.

## VNC Rerender / Isolation Strategy

The VNC viewer is intentionally kept behind a narrow prop boundary:

- `streamUrl`
- `isInitializing`

The iframe itself is rendered by a memoized `VncViewer` component in [`components/dashboard/vnc-panel.tsx`](./components/dashboard/vnc-panel.tsx). Event selection, tool details, and chat activity update adjacent UI without remounting the iframe.

Additional reliability details:

- iframe fullscreen is explicitly enabled via `allow="autoplay; fullscreen"` and `allowFullScreen`
- the desktop refresh action remains explicit via the existing sandbox refresh flow

## Local Development

### Prerequisites

- Node.js 18+
- A Vercel account with Sandbox access
- An Anthropic API key with sufficient credits

### Install

This repo currently contains both `package-lock.json` and `pnpm-lock.yaml`. `npm` is the safest choice unless you intentionally prefer `pnpm`.

```bash
npm install
```

### Vercel Authentication

Recommended:

```bash
vercel link
vercel env pull
```

That should populate `VERCEL_OIDC_TOKEN` locally.

### Create A Sandbox Snapshot

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

This snapshot installs the desktop runtime used by the app:

- Xvnc
- openbox
- noVNC
- websockify
- Google Chrome
- xdotool
- ImageMagick

When the script completes, copy the emitted snapshot id into `.env.local`.

### Run The App

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

Use the sanitized `.env.example` as the template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Auth for Anthropic model access |
| `SANDBOX_SNAPSHOT_ID` | Yes | Snapshot id for the prebuilt desktop environment |
| `VERCEL_OIDC_TOKEN` | Preferred | Local sandbox authentication after `vercel env pull` |
| `VERCEL_TOKEN` | Alternative | Manual Vercel auth token |
| `VERCEL_TEAM_ID` | With `VERCEL_TOKEN` | Vercel team scope |
| `VERCEL_PROJECT_ID` | With `VERCEL_TOKEN` | Vercel project scope |

## Deployment Notes

### Recommended Target: Vercel

This project is designed around `@vercel/sandbox`, so Vercel is the natural deployment target.

Deployment expectations:

- set `ANTHROPIC_API_KEY`
- set `SANDBOX_SNAPSHOT_ID`
- ensure the deployment environment has valid Vercel sandbox auth context

### Netlify / Other Hosts

Not recommended for full functionality.

Reason:

- the UI itself is standard Next.js
- the sandbox runtime depends on Vercel-specific sandbox infrastructure and auth

You could host the frontend elsewhere, but the computer-use sandbox path is built for Vercel.

### Build / Runtime Notes

- [`app/layout.tsx`](./app/layout.tsx) uses `next/font/google`, so builds need outbound network access to fetch Google fonts.
- The app relies on an Anthropic account with active credits. Without credits, chat requests fail even if the rest of the app boots correctly.
- The VNC iframe can initialize independently of the model, so a working desktop view does not guarantee AI chat requests will succeed.

## Known Limitations / Tradeoffs

- No multi-session history or localStorage persistence in the current codebase
- No backend persistence layer
- Event durations are client-observed, not authoritative sandbox execution timings
- Tool result previews are intentionally summarized; large payloads are not deeply expanded everywhere
- Screenshot-heavy sessions can still become large in memory
- Anthropic billing/credit issues surface at runtime and block tool use
- Vercel Sandbox setup is the main operational dependency for local development

## Reviewer Notes

The highest-signal engineering choices to review are:

- event normalization and derivation:
  [`hooks/use-agent-events.ts`](./hooks/use-agent-events.ts),
  [`lib/agent-events/normalize.ts`](./lib/agent-events/normalize.ts),
  [`lib/agent-events/selectors.ts`](./lib/agent-events/selectors.ts)
- VNC isolation:
  [`components/dashboard/vnc-panel.tsx`](./components/dashboard/vnc-panel.tsx)
- dashboard composition:
  [`components/dashboard/dashboard-layout.tsx`](./components/dashboard/dashboard-layout.tsx)
- tool detail and debug UX:
  [`components/dashboard/debug-panel.tsx`](./components/dashboard/debug-panel.tsx),
  [`components/dashboard/tool-details-panel.tsx`](./components/dashboard/tool-details-panel.tsx)

## Demo Guide

### 5-Minute Recommended Flow

1. Start on the dashboard and point out the two-panel layout.
2. Show the live VNC desktop on the right and the chat workspace on the left.
3. Send a simple browser task.
4. While the agent runs, point to:
   - inline tool cards
   - debug panel counts/timeline
   - selected tool detail panel
5. Click between tool events to show how the details panel updates.
6. Mention the typed event pipeline and memoized VNC viewer as the main frontend architecture decisions.
7. Close by noting the current limitation: session persistence is intentionally not yet implemented in this checked-in version.

### Key Technical Points To Mention

- Existing Vercel demo preserved rather than rewritten
- Typed event model layered on top of AI SDK message parts
- Derived selectors separate normalization from rendering
- VNC kept isolated from chat/event rerenders
- Sandbox lifecycle remains separate from dashboard state

## Suggested 5-Minute Demo Script

- “This is a refactor of the Vercel AI SDK computer-use demo into a dashboard-style agent interface.”
- “The left side is the operator workspace: chat, live tool activity, and debugging.”
- “The right side is the live desktop plus structured tool inspection.”
- “Under the hood, raw AI SDK messages are normalized into typed events. The dashboard renders off that event model instead of repeatedly parsing raw message parts.”
- “The VNC iframe is intentionally isolated so chat and event updates do not remount the live desktop.”
- “The main next step would be session persistence and multi-session history.”

## Submission Reminders

- Verify your Anthropic key has credits before recording the demo
- Verify `SANDBOX_SNAPSHOT_ID` is valid before recording
- If recording locally, confirm fullscreen works in noVNC after a hard refresh
- If a reviewer runs the project, they will need valid Anthropic and Vercel Sandbox credentials
- If a build is performed in a restricted environment, note the `next/font/google` network requirement
