import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { executeInSandbox, type Permissions } from "./sandbox.ts";

const NO_PERMS: Permissions = {
  net: false,
  read: false,
  write: false,
  env: false,
  run: false,
};

Deno.test("executes simple console.log and captures stdout", async () => {
  const result = await executeInSandbox(`console.log("hello sandbox");`, NO_PERMS);
  assertEquals(result.exitCode, 0);
  assertStringIncludes(result.stdout, "hello sandbox");
  assertEquals(result.permissionViolations.length, 0);
});

Deno.test("rejects code exceeding max size", async () => {
  const oversized = "x".repeat(11 * 1024); // 11KB > 10KB limit
  const result = await executeInSandbox(oversized, NO_PERMS);
  assertEquals(result.exitCode, 1);
  assertStringIncludes(result.stderr, "exceeds maximum allowed size");
  assertEquals(result.executionTimeMs, 0);
});

Deno.test("reports permission violation when net is denied", async () => {
  const code = `await fetch("https://example.com");`;
  const result = await executeInSandbox(code, NO_PERMS);
  assertEquals(result.exitCode, 1);
  // Deno should report a permission denial
  assert(
    result.permissionViolations.length > 0 || result.stderr.includes("NotCapable") || result.stderr.includes("PermissionDenied"),
    `Expected permission violation, got stderr: ${result.stderr}`,
  );
});

Deno.test("allows net access when permission is granted", async () => {
  const code = `const r = await fetch("https://example.com"); console.log(r.status);`;
  const perms: Permissions = { ...NO_PERMS, net: true };
  const result = await executeInSandbox(code, perms);
  assertEquals(result.exitCode, 0);
  assertStringIncludes(result.stdout, "200");
  assertEquals(result.permissionViolations.length, 0);
});

// Import assert for the permission violation test
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
