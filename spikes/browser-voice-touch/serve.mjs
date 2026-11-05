import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = {
  "/": ["index.html", "text/html"],
  "/probe.js": ["probe.js", "text/javascript"],
};

createServer(async (req, res) => {
  const entry = Object.hasOwn(files, req.url) && files[req.url];
  if (!entry || req.method !== "GET") {
    res.writeHead(404).end();
    return;
  }
  const [name, type] = entry;
  res.writeHead(200, {
    "Content-Type": type + "; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
  });
  res.end(await readFile(new URL(name, import.meta.url)));
}).listen(8280, "127.0.0.1", () => console.log("http://localhost:8280/"));

