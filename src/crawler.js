import path from "path";
import fs from "fs";
import { mkdir, writeFile, readFile } from "fs/promises";
import { createHash } from "crypto";

import puppeteer from "puppeteer";
import Critters from "critters";
import fsExtra from "fs-extra";
import pLimit from "p-limit";
import prettyBytes from "pretty-bytes";

import { createSpinner, logLabel, logStamp, logInfo, logSuccess, logWarn, logError, generateSitemap } from "./utils.js";

async function findBundle(inputDir) {
  const indexPath = path.join(inputDir, "index.html");
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf-8");
    const scriptMatch = html.match(/<script[^>]+src=["']([^"']+\.js)["'][^>]*>/i);
    if (scriptMatch) {
      const src = scriptMatch[1].replace(/^\//, "");
      const scriptPath = path.join(inputDir, src);
      if (fs.existsSync(scriptPath)) {
        return src;
      }
    }
  }
  const files = fs.readdirSync(inputDir, { recursive: true });
  const jsFile = files.find((file) => file.endsWith(".js") && !file.includes("chunk") && !file.includes("vendor"));
  return jsFile || null;
}

async function crawlRoutes({
  routes,
  basePath,
  baseUrl,
  inputDir,
  outDir,
  port,
  concurrency,
  flatOutput,
  hydrate,
  hydrateBundle,
  framework,
  batchSize,
  incremental,
  timeout,
  inlineCss,
  sitemap,
  excludeRoutes = [],
  customSelectors = [],
}) {
  const cacheDir = ".zepsh/cache";
  const results = [];
  const spinner = createSpinner("Starting route crawling ...");
  const formattedBasePath = basePath && basePath !== "/" ? (basePath.startsWith("/") ? basePath : `/${basePath}`) : "";

  await mkdir(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, "ssg.json");
  let cache = {};
  if (incremental && fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(await readFile(cacheFile, "utf-8"));
      logInfo(`Loaded cache from '${cacheFile}'`);
    } catch (error) {
      logWarn(`Failed to load cache: ${error.message}`);
    }
  }

  const processedRoutes = [];
  for (const route of routes) {
    if (typeof route === "string") {
      if (!excludeRoutes.some((ex) => route.match(new RegExp(`^${ex.replace("*", ".*")}$`)))) {
        processedRoutes.push({ path: route, timeout });
      }
    } else if (route.path && route.params) {
      for (const paramSet of route.params) {
        let dynamicRoute = route.path;
        for (const [key, value] of Object.entries(paramSet)) dynamicRoute = dynamicRoute.replace(`:${key}`, value);
        if (!excludeRoutes.some((ex) => dynamicRoute.match(new RegExp(`^${ex.replace("*", ".*")}$`)))) {
          processedRoutes.push({
            path: dynamicRoute,
            timeout: route.timeout || timeout,
          });
        }
      }
    } else {
      if (!excludeRoutes.some((ex) => route.path.match(new RegExp(`^${ex.replace("*", ".*")}$`)))) {
        processedRoutes.push({
          path: route.path,
          timeout: route.timeout || timeout,
        });
      }
    }
  }

  fsExtra.copySync(inputDir, outDir);
  spinner.succeed(`${logStamp()} ${logLabel("success")} Copied '${inputDir}' → '${outDir}'`);

  let scriptSrc = null;
  if (hydrate) {
    scriptSrc = hydrateBundle || (await findBundle(inputDir));
    if (scriptSrc) {
      const fullPath = path.join(inputDir, scriptSrc);
      if (!fs.existsSync(fullPath)) {
        logWarn(`Hydration bundle '${scriptSrc}' not found in '${inputDir}'. Skipping script injection`);
        scriptSrc = null;
      } else {
        logInfo(`Using hydration bundle: '${scriptSrc}'`);
      }
    } else {
      logWarn(`No hydration bundle found in '${inputDir}'. Skipping script injection`);
    }
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const frameworks = {
    react: ["#root > *", "#app > *", "[data-reactroot]"],
    vite: ["#root > *", "#app > *"],
    vue: ["#app > *"],
    svelte: ["[data-svelte]", "body > div > *"],
  };
  const selectors = customSelectors.length > 0 ? customSelectors : frameworks[framework] || ["body > div > *"];

  const pagePool = [];
  for (let i = 0; i < Math.min(concurrency, 3); i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font"].includes(req.resourceType()) && !inlineCss) req.abort();
      else req.continue();
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") logWarn(`Browser console error: ${msg.text()}`);
    });
    page.on("pageerror", (error) => {
      logWarn(`Page error: ${error.message}`);
    });
    pagePool.push(page);
  }

  const limit = pLimit(concurrency);
  const critters = new Critters({ path: inputDir, logLevel: "silent" });

  for (let i = 0; i < processedRoutes.length; i += batchSize) {
    const batch = processedRoutes.slice(i, i + batchSize);
    const batchSpinner = createSpinner(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(processedRoutes.length / batchSize)} (${batch.length} routes) ...`);

    await Promise.all(
      batch.map(({ path: route, timeout: routeTimeout }, index) =>
        limit(async () => {
          const startTime = Date.now();
          const page = pagePool[index % pagePool.length];
          const crawlPath = `${formattedBasePath}${route}`.replace(/\/+/g, "/");
          const fullUrl = `http://localhost:${port}${crawlPath}`;
          const routeSpinner = createSpinner(`Crawling: '${fullUrl}' ...`);

          let filePath;
          if (route === "/") {
            filePath = path.join(inputDir, "index.html");
          } else {
            filePath = path.join(inputDir, route, "index.html");
            if (!fs.existsSync(filePath) && !path.extname(route)) {
              const htmlPath = path.join(inputDir, `${route}.html`);
              if (fs.existsSync(htmlPath)) filePath = htmlPath;
            }
          }

          if (incremental && fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            const hash = createHash("md5").update(content).digest("hex");
            logInfo(`Checking cache for ${route}: file=${filePath}, hash=${hash}, cachedHash=${cache[route] || "none"}`);
            if (cache[route] === hash) {
              routeSpinner.succeed(`${logStamp()} ${logLabel("info")} Skipped '${route}' (unchanged)`);
              results.push({
                route,
                status: "skipped",
                filePath,
                fileSize: fs.existsSync(filePath) ? prettyBytes(fs.statSync(filePath).size) : "0 B",
                duration: 0,
              });
              return;
            }
            cache[route] = hash;
          } else if (incremental && !fs.existsSync(filePath)) {
            logWarn(`No source file found for '${route}' at '${filePath}'. Crawling without cache ...`);
          }

          try {
            await page.goto(fullUrl, {
              waitUntil: "networkidle0",
              timeout: routeTimeout,
            });

            let contentFound = false;
            for (const selector of selectors) {
              try {
                await page.waitForSelector(selector, { timeout: 5000 });
                contentFound = true;
                routeSpinner.succeed(`${logStamp()} ${logLabel("success")} Content found with selector: '${selector}' for '${route}'`);
                break;
              } catch (error) {
                logWarn(`Selector '${selector}' not found for '${route}', trying next ...`);
              }
            }

            if (!contentFound) {
              logWarn(`No framework content selectors found for '${route}', waiting for general content ...`);
              await page.waitForFunction(() => document.body.children.length > 0 && document.body.textContent.trim().length > 0, { timeout: 10000 });
              routeSpinner.succeed(`${logStamp()} ${logLabel("success")} General content loaded for '${route}'`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));

            let html = await page.content();
            if (inlineCss) {
              try {
                html = await critters.process(html);
                logSuccess(`CSS inlined for '${route}'`);
              } catch (error) {
                logWarn(`CSS inlining failed for '${route}': ${error.message}`);
              }
            }

            if (hydrate && scriptSrc) {
              const scriptPath = `/${scriptSrc.replace(/\\/g, "/")}`;
              html = html.replace("</body>", `<script src="${formattedBasePath}${scriptPath}" defer></script></body>`);
              logSuccess(`Hydration script injected for '${route}': '${scriptPath}'`);
            }

            let outputFilePath;
            if (route === "/") outputFilePath = path.join(outDir, "index.html");
            else outputFilePath = flatOutput ? path.join(outDir, `${route.replace(/^\//, "")}.html`) : path.join(outDir, route, "index.html");

            await mkdir(path.dirname(outputFilePath), { recursive: true });
            await writeFile(outputFilePath, html, "utf-8");
            const fileSize = prettyBytes(fs.statSync(outputFilePath).size);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logSuccess(`'${route}' → '${outputFilePath}' (${fileSize}) ${duration}s`);
            results.push({
              route,
              status: "success",
              filePath: outputFilePath,
              fileSize,
              duration,
            });

            if (incremental && fs.existsSync(filePath)) {
              cache[route] = createHash("md5").update(fs.readFileSync(filePath, "utf-8")).digest("hex");
            }
          } catch (error) {
            logError(`Crawling failed for route '${route}': ${error.message}`);
            try {
              const screenshotPath = path.join(".zepsh/debug", `screenshots/ssg/${route.replace(/\/+/g, "_")}.png`);
              await mkdir(path.dirname(screenshotPath), { recursive: true });
              await page.screenshot({ path: screenshotPath });
              logInfo(`Debug screenshot saved: '${screenshotPath}'`);
            } catch (error) {
              logError("Could not save debug screenshot");
            }
            routeSpinner.fail(`${logStamp()} ${logLabel("error")} Failed: '${route}'`);
            results.push({ route, status: "failed", error: error.message });
          }
        })
      )
    );
    batchSpinner.succeed(`${logStamp()} ${logLabel("success")} Batch ${Math.floor(i / batchSize) + 1} completed`);
  }

  if (incremental) {
    try {
      await writeFile(cacheFile, JSON.stringify(cache, null, 2), "utf-8");
      logInfo(`Cache saved: '${cacheFile}'`);
    } catch (error) {
      logWarn(`Failed to save cache: ${error.message}`);
    }
  }

  if (sitemap) {
    const sitemapPath = await generateSitemap(routes, baseUrl, outDir, formattedBasePath);
    logSuccess(`Sitemap generated: '${sitemapPath}'`);
  }

  await Promise.all(pagePool.map((page) => page.close()));
  await browser.close();
  spinner.succeed(`${logStamp()} ${logLabel("success")} Crawling finished`);
  return results;
}

export { crawlRoutes };
