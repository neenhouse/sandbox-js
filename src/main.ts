import { executeInSandbox, type Permissions } from "./sandbox.ts";

const PORT = 8000;

async function serveStaticFile(path: string): Promise<Response> {
  try {
    const content = await Deno.readFile(path);
    const ext = path.split(".").pop() ?? "";
    const contentTypes: Record<string, string> = {
      html: "text/html; charset=utf-8",
      css: "text/css; charset=utf-8",
      js: "application/javascript; charset=utf-8",
      json: "application/json",
      ico: "image/x-icon",
      png: "image/png",
      svg: "image/svg+xml",
    };
    const contentType = contentTypes[ext] ?? "application/octet-stream";
    return new Response(content, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // CORS headers for API routes
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Route: GET / → serve index.html
  if (req.method === "GET" && pathname === "/") {
    return serveStaticFile("static/index.html");
  }

  // Route: GET /static/* → serve static files
  if (req.method === "GET" && pathname.startsWith("/static/")) {
    const filePath = pathname.slice(1); // Remove leading /
    return serveStaticFile(filePath);
  }

  // Route: POST /api/execute → run code in sandbox
  if (req.method === "POST" && pathname === "/api/execute") {
    try {
      const body = await req.json();
      const { code, permissions } = body as {
        code: string;
        permissions: Permissions;
      };

      if (typeof code !== "string") {
        return new Response(
          JSON.stringify({ error: "code must be a string" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await executeInSandbox(
        code,
        permissions ?? {
          net: false,
          read: false,
          write: false,
          env: false,
          run: false,
        },
      );

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: `Request error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // 404 fallback
  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

console.log(`SandboxJS server running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, handler);
