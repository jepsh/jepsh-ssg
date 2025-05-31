import http from "http";
import fs from "fs";
import path from "path";

import { getMimeType, logInfo, logError } from "./utils.js";

function startServer({ basePath, inputDir, port }) {
  if (!fs.existsSync(inputDir) || !fs.existsSync(path.join(inputDir, "index.html"))) {
    throw new Error(`Input directory '${inputDir}' does not exist or is missing index.html`);
  }

  const formattedBasePath = basePath && basePath !== "/" ? (basePath.startsWith("/") ? basePath : `/${basePath}`) : "";

  const server = http.createServer((req, res) => {
    let url = req.url || "/";
    url = url.split("?")[0].split("#")[0];

    if (formattedBasePath && url.startsWith(formattedBasePath)) {
      url = url.slice(formattedBasePath.length) || "/";
    }

    let filePath = path.join(inputDir, url === "/" ? "index.html" : url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      const htmlPath = filePath + ".html";
      if (fs.existsSync(htmlPath)) filePath = htmlPath;
    }

    if (!fs.existsSync(filePath)) {
      const indexPath = path.join(inputDir, "index.html");
      if (fs.existsSync(indexPath) && !url.includes(".")) {
        filePath = indexPath;
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`Not found: '${url}'\nEnsure the file exists in '${inputDir}'`);
        return;
      }
    }

    try {
      const stats = fs.statSync(filePath);
      const mimeType = getMimeType(filePath);
      const lastModified = stats.mtime.toUTCString();

      if (req.headers["if-modified-since"] === lastModified && !mimeType.startsWith("text/html")) {
        res.writeHead(304, {});
        res.end();
        return;
      }

      res.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": stats.size,
        "Last-Modified": lastModified,
        "Cache-Control": mimeType.startsWith("image/") || mimeType.includes("font") ? "public, max-age=31536000" : "no-cache",
      });

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      logError(`Server error for '${url}:' ${error.message}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      logInfo(`Serving ${inputDir} at http://localhost:${port}${formattedBasePath}`);
      resolve(() => server.close());
    });
  });
}

export { startServer };
