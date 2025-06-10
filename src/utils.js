import { mkdir, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";

import chalk from "chalk";
import ora from "ora";

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  };

  return mimeTypes[ext] || "application/octet-stream";
};

const createSpinner = (text) => {
  return ora({
    text: `${logStamp()} ${logLabel("info")} ${text}\n`,
    spinner: "dots",
    color: "cyan",
  }).start();
};

const logToFile = async (message) => {
  const logDir = path.join(".jepsh/debug", "logs");
  await mkdir(logDir, { recursive: true });

  const logFile = fs.createWriteStream(path.join(logDir, "ssg.log"), {
    flags: "a",
  });
  if (logFile) logFile.write(`${logStamp()} ${message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-OR-Zcf-nqry=><]/g, "")}\n`);
};

const logLabel = (label) => {
  switch (label) {
    case "info":
      return `${chalk.bgCyan.bold(" INFO ")}   `;
    case "success":
      return `${chalk.bgGreen.bold(" SUCCESS ")}`;
    case "warn":
      return `${chalk.bgYellow.bold(" WARN ")}   `;
    case "error":
      return `${chalk.bgRed.bold(" ERROR ")}  `;
  }
};

const logStamp = () => {
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}]`;
};

const logHeader = () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
  const content = `
  ███████╗███████╗██████╗ ███████╗██╗  ██╗
  ╚══███╔╝██╔════╝██╔══██╗██╔════╝██║  ██║
    ███╔╝ █████╗  ██████╔╝███████╗███████║
   ███╔╝  ██╔══╝  ██╔═══╝ ╚════██║██╔══██║
  ███████╗███████╗██║     ███████║██║  ██║
  ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
  ${packageJson.version.padEnd(20)}`;

  console.log(chalk.cyan.bold(content));
  logToFile(`${logLabel("info")} Jepsh SSG started ...`);
};

const logConfig = (config) => {
  const routeCount = config.routes.length;
  const date = new Date().toLocaleString();
  const content = `${chalk.bold("• Configuration")}
  Routes      : ${chalk.green.bold(`${routeCount} route${routeCount !== 1 ? "s" : ""}`)}
  Input       : ${chalk.green.bold(`${config.inputDir}`)}
  Output      : ${chalk.green.bold(`${config.outDir}`)}
  Port        : ${chalk.green.bold(`${config.port}`)}
  Framework   : ${chalk.green.bold(`${config.framework}`)}
  Started     : ${chalk.green.bold(`${date}`)}`;

  console.log(`\n${content}\n`);
};

const logInfo = (message, ...args) => {
  const content = `${logLabel("info")} ${message}`;
  console.log(`+ ${logStamp()} ${content}`, ...args);
  logToFile(content);
};

const logSuccess = (message, ...args) => {
  const content = `${logLabel("success")} ${message}`;
  console.log(`+ ${logStamp()} ${content}`, ...args);
  logToFile(content);
};

const logWarn = (message, ...args) => {
  const content = `${logLabel("warn")} ${message}`;
  console.log(`+ ${logStamp()} ${content}`, ...args);
  logToFile(content);
};

const logError = (message, ...args) => {
  const content = `${logLabel("error")} ${message}`;
  console.log(`+ ${logStamp()} ${content}`, ...args);
  logToFile(content);
};

const logSummary = (results, totalDuration) => {
  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const total = results.length;
  const average = total > 0 ? (totalDuration / total / 1000).toFixed(2) : 0;

  const content = `${chalk.bold("• Reports")}
  Successful  : ${chalk.green.bold(`${successful} route${successful !== 1 ? "s" : ""}`)}
  Failed      : ${chalk.red.bold(`${failed} route${failed !== 1 ? "s" : ""}`)}
  Total       : ${chalk.bold(`${total} route${total !== 1 ? "s" : ""}`)}\n\n${chalk.bold("• Performance")}
  Duration    : ${chalk.cyan.bold(`${(totalDuration / 1000).toFixed(1)}s`)}
  Average     : ${chalk.cyan.bold(`${average}s per route`)}`;

  console.log(`\n${content}\n`);

  if (failed === 0) logSuccess(`All ${total} route(s) processed successfully`);
  else logWarn(`${successful} route(s) processed successfully, ${failed} failed`);
};

const generateSitemap = async (routes, baseUrl, outDir, basePath) => {
  const processedRoutes = [];
  for (const route of routes) {
    if (typeof route === "string") {
      processedRoutes.push(route);
    } else if (route.path && route.params) {
      for (const paramSet of route.params) {
        let dynamicRoute = route.path;
        for (const [key, value] of Object.entries(paramSet)) dynamicRoute = dynamicRoute.replace(`:${key}`, value);
        processedRoutes.push(dynamicRoute);
      }
    } else {
      processedRoutes.push(route.path);
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${processedRoutes
  .map(
    (route) => `
  <url>
    <loc>${baseUrl}${basePath}${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  const sitemapPath = path.join(outDir, "sitemap.xml");
  await writeFile(sitemapPath, sitemap, "utf-8");
  logSuccess(`Generated sitemap: '${sitemapPath}'`);
  return sitemapPath;
};

const clearCache = async () => {
  const cacheDir = path.join(process.cwd(), ".jepsh/caches", "ssg.json");
  if (fs.existsSync(cacheDir)) {
    await fs.promises.rm(cacheDir, { recursive: true, force: true });
  }
};

const clearLogs = async () => {
  const logsDir = path.join(process.cwd(), ".jepsh/debug/logs", "ssg.log");
  const screenshotsDir = path.join(process.cwd(), ".jepsh/debug/screenshots", "ssg");
  if (fs.existsSync(logsDir)) {
    await fs.promises.rm(logsDir, { recursive: true, force: true });
  }
  if (fs.existsSync(screenshotsDir)) {
    await fs.promises.rm(screenshotsDir, { recursive: true, force: true });
  }
};

export { getMimeType, createSpinner, logLabel, logStamp, logHeader, logConfig, logInfo, logSuccess, logWarn, logError, logSummary, generateSitemap, clearCache, clearLogs };
