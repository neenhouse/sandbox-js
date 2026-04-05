# SandboxJS

Secure code playground — run arbitrary TypeScript/JavaScript in isolated Deno sandboxes with per-execution permission controls.

## Tech Stack

- **Runtime**: Deno 2.x
- **Server**: Deno.serve (native HTTP server)
- **Sandboxing**: Deno.Command subprocess with granular --allow-* flags
- **Frontend**: Vanilla HTML/CSS/JS + CodeMirror editor (CDN)
- **Deploy**: Fly.io (Docker)

## Commands

- `deno task dev` — Start dev server with watch mode (port 8000)
- `deno task start` — Start production server
- `deno task build` — Type-check and cache dependencies
- `deno task test` — Run test suite
