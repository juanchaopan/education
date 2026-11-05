import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/probe.js": ["probe.js", "text/javascript; charset=utf-8"],
  "/sample.m4a": ["fixtures/1.m4a", "audio/mp4"],
};

createServer(async (req, res) => {
  const entry = Object.hasOwn(files, req.url) && files[req.url];
  if (!entry || req.method !== "GET") {
    res.writeHead(404).end();
    return;
  }
  const [name, type] = entry;
  const body = await readFile(new URL(name, import.meta.url));
  const headers = {
    "Content-Type": type,
    "Content-Length": body.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
  };
  if (type === "audio/mp4") {
    headers["Accept-Ranges"] = "bytes";
    if (req.headers.range) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      const start = range ? Number(range[1]) : body.length;
      const end = range?.[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      if (start > end) {
        res.writeHead(416, { "Content-Range": "bytes */" + body.length }).end();
        return;
      }
      headers["Content-Length"] = end - start + 1;
      headers["Content-Range"] = "bytes " + start + "-" + end + "/" + body.length;
      res.writeHead(206, headers).end(body.subarray(start, end + 1));
      return;
    }
  }
  res.writeHead(200, headers).end(body);
}).listen(8280, "127.0.0.1", () => console.log("http://localhost:8280/"));

