# OBS UI Monorepo

A monorepo containing the OBS UI application, browser extension, and UI components.

## Structure

```
.
├── app/          # Main backend application (Bun + Express + Socket.io)
├── extension/    # Browser extension (WXT + Svelte)
├── ui/           # Frontend UI (SvelteKit + Vite)
└── package.json  # Root workspace configuration
```

## Prerequisites

- [Bun](https://bun.sh/) (latest version)

## Getting Started

### Install Dependencies

From the root directory:

```bash
bun install
```

This will install dependencies for all packages in the monorepo.

## Development

### Run All Services

```bash
# Start the backend app
bun run dev:app

# Start the extension in dev mode
bun run dev:extension

# Start the UI in dev mode
bun run dev:ui
```

### Run Individual Packages

```bash
# App only
cd app
bun start

# Extension only
cd extension
bun run dev

# UI only
cd ui
bun run dev
```

## Building

### Build All

```bash
bun run build
```

This will build all three packages in the correct order: UI → Extension → App

### Build Individual Packages

```bash
bun run build:app
bun run build:extension
bun run build:ui
```

## Type Checking

```bash
# Check extension types
bun run check:extension

# Check UI types
bun run check:ui
```

## Package Details

### App (`@obs-ui/app`)
- Backend application built with Bun, Express, and Socket.io
- Handles real-time communication and data management
- Scripts: `start`, `compile`

### Extension (`@obs-ui/extension`)
- Browser extension for media metadata extraction
- Built with WXT and Svelte 5
- Scripts: `dev`, `build`, `check`

### UI (`@obs-ui/ui`)
- Frontend built with SvelteKit and Tailwind CSS
- Provides dashboard and widgets interface
- Scripts: `dev`, `build`, `preview`, `check`

## Workspace Commands

All commands should be run from the root directory:

| Command | Description |
|---------|-------------|
| `bun run dev:app` | Start app in dev mode |
| `bun run dev:extension` | Start extension in dev mode |
| `bun run dev:ui` | Start UI in dev mode |
| `bun run build` | Build all packages |
| `bun run build:app` | Build app only |
| `bun run build:extension` | Build extension only |
| `bun run build:ui` | Build UI only |

## Notes

- This monorepo uses Bun workspaces for package management
- All packages are private and not intended for publication
- The build order matters: UI and Extension should be built before App for proper asset compilation
