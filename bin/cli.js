#!/usr/bin/env node

import { program } from "commander";
import { watch } from "chokidar";

import { loadConfig, startServer, crawlRoutes } from "../src/index.js";
import { logHeader, logConfig, logInfo, logSuccess, logError, logSummary } from "../src/utils.js";

program
  .storeOptionsAsProperties(false)
  .option("--routes <routes>", "Comma-separated routes (e.g., /,/about,/users/:id[1,2])")
  .option("--base-path <path>", "Base path for routes")
  .option("--base-url <url>", "Base URL for sitemap")
  .option("-i, --input-dir <path>", "Input directory")
  .option("-o, --out-dir <path>", "Output directory")
  .option("-p, --port <number>", "Port to run server on")
  .option("--concurrency <number>", "Number of concurrent crawls")
  .option("--flat-output", "Use flat output file structure")
  .option("--hydrate", "Inject hydration script")
  .option("--hydrate-bundle <path>", "Path to hydration bundle (relative to inputDir)")
  .option("--framework <name>", "Framework to use (react, vue, svelte)")
  .option("--batch-size <number>", "Number of routes per batch")
  .option("--incremental", "Enable incremental builds")
  .option("--timeout <number>", "Timeout per route in ms")
  .option("--inline-css", "Enable CSS inlining")
  .option("--sitemap", "Generate sitemap")
  .option("--exclude-routes <routes>", "Comma-separated routes to exclude")
  .option("--custom-selectors <selectors>", "Comma-separated custom selectors")
  .option("--watch", "Watch for file changes and rebuild")
  .option("--dry-run", "Preview routes without writing files")
  .allowUnknownOption(false)
  .parse(process.argv);

const options = program.opts();

async function runBuild(config, dryRun = false) {
  try {
    if (dryRun) {
      logInfo("Dry run mode: Previewing routes ...");
      config.routes.forEach((route) => {
        const routePath = typeof route === "string" ? route : route.path;
        logInfo(`Route: '${routePath}'`);
      });
      return;
    }

    const startTime = Date.now();
    const stopServer = await startServer({
      basePath: config.basePath,
      inputDir: config.inputDir,
      port: config.port,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const results = await crawlRoutes(config);
    stopServer();

    const totalDuration = Date.now() - startTime;
    logSummary(results, totalDuration);
    logSuccess("Done!");
  } catch (error) {
    logError(`Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  let serverClose;
  process.on("SIGINT", async () => {
    logInfo("Received Ctrl+C, shutting down ...");
    if (serverClose) await serverClose();
    process.exit(0);
  });

  logHeader();
  try {
    let config;
    const hasCliOptions = Object.keys(options).length > 0;
    if (!hasCliOptions) config = await loadConfig();

    const mergedConfig = {
      ...config,
      ...(options.routes && {
        routes: options.routes.split(",").map((route) => {
          const match = route.match(/(.+):id\[(.+)\]/);
          if (match) {
            const [, path, ids] = match;
            return {
              path,
              params: ids.split(",").map((id) => ({ id: id.trim() })),
            };
          }
          return route.trim();
        }),
      }),
      ...(options.basePath && { basePath: options.basePath }),
      ...(options.baseUrl && { baseUrl: options.baseUrl }),
      ...(options.inputDir && { inputDir: options.inputDir }),
      ...(options.outDir && { outDir: options.outDir }),
      ...(options.port && { port: parseInt(options.port, 10) }),
      ...(options.concurrency && {
        concurrency: parseInt(options.concurrency, 10),
      }),
      ...(options.flatOutput !== undefined && { flatOutput: true }),
      ...(options.hydrate !== undefined && { hydrate: true }),
      ...(options.hydrateBundle && { hydrateBundle: options.hydrateBundle }),
      ...(options.framework && { framework: options.framework }),
      ...(options.batchSize && { batchSize: parseInt(options.batchSize, 10) }),
      ...(options.incremental !== undefined && { incremental: true }),
      ...(options.timeout && { timeout: parseInt(options.timeout, 10) }),
      ...(options.inlineCss !== undefined && { inlineCss: true }),
      ...(options.sitemap !== undefined && { sitemap: true }),
      ...(options.excludeRoutes && {
        excludeRoutes: options.excludeRoutes.split(",").map((r) => r.trim()),
      }),
      ...(options.customSelectors && {
        customSelectors: options.customSelectors.split(",").map((s) => s.trim()),
      }),
    };
    logConfig(mergedConfig);

    if (options.watch) {
      logInfo("Starting watch mode ...");
      const watcher = watch(mergedConfig.inputDir, {
        persistent: true,
      });
      watcher.on("change", async (path) => {
        logInfo(`File changed: '${path}'. Triggering rebuild ...`);
        try {
          await runBuild(mergedConfig, options.dryRun);
        } catch (error) {
          process.exit(1);
        }
      });
    } else {
      await runBuild(mergedConfig, options.dryRun);
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
