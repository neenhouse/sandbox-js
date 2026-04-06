export interface Permissions {
  net: boolean;
  read: boolean;
  write: boolean;
  env: boolean;
  run: boolean;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  permissionViolations: string[];
}

const MAX_CODE_SIZE = 10 * 1024; // 10KB
const TIMEOUT_MS = 5000;

// Resolve the deno executable path at startup
function resolveDenoPath(): string {
  // Try the running process's executable first
  try {
    const self = Deno.execPath();
    if (self && self.includes("deno")) return self;
  } catch {
    // ignore
  }
  // Common install locations
  const candidates = [
    "/Users/neenhouse/.deno/bin/deno",
    "/usr/local/bin/deno",
    "/usr/bin/deno",
    "/opt/homebrew/bin/deno",
    "deno",
  ];
  for (const c of candidates) {
    try {
      Deno.statSync(c);
      return c;
    } catch {
      // keep trying
    }
  }
  return "deno";
}

const DENO_PATH = resolveDenoPath();

export async function executeInSandbox(
  code: string,
  permissions: Permissions,
): Promise<ExecutionResult> {
  if (code.length > MAX_CODE_SIZE) {
    return {
      stdout: "",
      stderr:
        `Error: Code size exceeds maximum allowed size of ${MAX_CODE_SIZE} bytes`,
      exitCode: 1,
      executionTimeMs: 0,
      permissionViolations: [],
    };
  }

  // Build permission flags
  const flags: string[] = ["run"];

  if (permissions.net) flags.push("--allow-net");
  if (permissions.read) flags.push("--allow-read");
  if (permissions.write) flags.push("--allow-write");
  if (permissions.env) flags.push("--allow-env");
  if (permissions.run) flags.push("--allow-run");

  // Prevent interactive permission prompts
  flags.push("--no-prompt");

  let tempFile: string | null = null;
  const startTime = Date.now();

  try {
    // Write code to temp file
    tempFile = await Deno.makeTempFile({ suffix: ".ts" });
    await Deno.writeTextFile(tempFile, code);

    flags.push(tempFile);

    const command = new Deno.Command(DENO_PATH, {
      args: flags,
      stdout: "piped",
      stderr: "piped",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const output = await command.output();
    const executionTimeMs = Date.now() - startTime;

    const stdout = new TextDecoder().decode(output.stdout);
    const stderr = stripAnsi(new TextDecoder().decode(output.stderr));

    // Parse permission violations from stderr
    const permissionViolations = parsePermissionViolations(stderr);

    return {
      stdout,
      stderr,
      exitCode: output.code,
      executionTimeMs,
      permissionViolations,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        stdout: "",
        stderr: "Execution timed out after 5 seconds",
        exitCode: 124,
        executionTimeMs,
        permissionViolations: [],
      };
    }

    return {
      stdout: "",
      stderr: `Execution error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      exitCode: 1,
      executionTimeMs,
      permissionViolations: [],
    };
  } finally {
    // Always clean up temp file
    if (tempFile !== null) {
      try {
        await Deno.remove(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Strip ANSI escape codes for clean output
function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function parsePermissionViolations(stderr: string): string[] {
  const violations: string[] = [];
  const lines = stderr.split("\n");

  for (const line of lines) {
    // Match Deno permission denied errors
    // Example: "error: Uncaught PermissionDenied: Requires net access to ..."
    if (line.includes("PermissionDenied") || line.includes("NotCapable")) {
      // Extract the meaningful part
      const match = line.match(/(?:PermissionDenied|NotCapable):\s*(.+)/);
      if (match) {
        violations.push(match[1].trim());
      } else {
        violations.push(line.trim());
      }
    }
  }

  return violations;
}
