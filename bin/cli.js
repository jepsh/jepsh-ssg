#!/usr/bin/env node

import fs from "fs";
import path from "path";

import { program } from "commander";
import { watch } from "chokidar";
import inquirer from "inquirer";

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
  .option("--no-inline-css", "Disable CSS inlining")
  .option("--sitemap", "Generate sitemap")
  .option("--exclude-routes <routes>", "Comma-separated routes to exclude")
  .option("--custom-selectors <selectors>", "Comma-separated custom selectors")
  .option("--watch", "Watch for file changes and rebuild")
  .option("--dry-run", "Preview routes without writing files")
  .allowUnknownOption(false)
  .parse(process.argv);

const options = program.opts();

async function autoDetectRoutes(inputDir) {
  const routes = new Set(["/"]);
  const scanDir = (dir, base = "") => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        scanDir(filePath, `${base}/${file}`);
      } else if (file === "index.html") {
        const route = base || "/";
        routes.add(route);
      } else if (file.endsWith(".html") && file !== "index.html") {
        const route = `${base}/${file.replace(/\.html$/, "")}`;
        routes.add(route);
      }
    }
  };
  scanDir(inputDir);
  return Array.from(routes);
}

async function promptConfig() {
  return inquirer
    .prompt([
      {
        type: "input",
        name: "routes",
        message: "Routes to crawl (comma-separated, e.g., /,/about,/users/:id[1,2]):",
        default: "auto",
        validate: (input) => (input.trim() ? true : "At least one route is required"),
      },
      {
        type: "input",
        name: "basePath",
        message: "Base path for routes (e.g., /app):",
        default: "",
      },
      {
        type: "input",
        name: "baseUrl",
        message: "Base URL for sitemap (e.g., https://example.com):",
        default: "http://localhost:3000",
        validate: (input) => (/^(http|https):\/\/[^ "]+$/.test(input) ? true : "Invalid URL format"),
      },
      {
        type: "input",
        name: "inputDir",
        message: "Input directory (where your built files are located):",
        default: "build",
        validate: (input) => {
          if (!fs.existsSync(input)) return `Directory '${input}' does not exist`;
          if (!fs.existsSync(path.join(input, "index.html"))) return `No index.html found in '${input}'`;
          return true;
        },
      },
      {
        type: "input",
        name: "outDir",
        message: "Output directory (where static files will be saved):",
        default: "build-ssg",
      },
      {
        type: "input",
        name: "port",
        message: "Server port:",
        default: 3000,
        validate: (input) => {
          const port = parseInt(input, 10);
          if (isNaN(port) || port < 1 || port > 65535) return "Port must be a number between 1 and 65535";
          return true;
        },
      },
      {
        type: "input",
        name: "concurrency",
        message: "Number of concurrent crawls:",
        default: 3,
        validate: (input) => {
          const num = parseInt(input, 10);
          if (isNaN(num) || num < 1) return "Concurrency must be a positive number";
          return true;
        },
      },
      {
        type: "confirm",
        name: "flatOutput",
        message: "Use flat output structure (e.g., about.html instead of about/index.html)?",
        default: false,
      },
      {
        type: "confirm",
        name: "hydrate",
        message: "Inject hydration script for client-side rendering?",
        default: false,
      },
      {
        type: "input",
        name: "hydrateBundle",
        message: "Path to hydration bundle (relative to inputDir, e.g., assets/js/main.js, or leave blank to auto-detect):",
        default: "",
        when: (answers) => answers.hydrate,
      },
      {
        type: "list",
        name: "framework",
        message: "Framework to use:",
        choices: ["react", "vue", "svelte"],
        default: "react",
      },
      {
        type: "input",
        name: "batchSize",
        message: "Number of routes per batch:",
        default: 50,
        validate: (input) => {
          const num = parseInt(input, 10);
          if (isNaN(num) || num < 1) return "Batch size must be a positive number";
          return true;
        },
      },
      {
        type: "confirm",
        name: "incremental",
        message: "Enable incremental builds (only recrawl changed routes)?",
        default: false,
      },
      {
        type: "input",
        name: "timeout",
        message: "Timeout per route in ms:",
        default: 30000,
        validate: (input) => {
          const num = parseInt(input, 10);
          if (isNaN(num) || num < 1) return "Timeout must be a positive number";
          return true;
        },
      },
      {
        type: "confirm",
        name: "inlineCss",
        message: "Inline CSS in generated HTML?",
        default: true,
      },
      {
        type: "confirm",
        name: "sitemap",
        message: "Generate sitemap.xml?",
        default: false,
      },
      {
        type: "input",
        name: "excludeRoutes",
        message: "Routes to exclude (comma-separated, e.g., /api/*):",
        default: "",
      },
      {
        type: "input",
        name: "customSelectors",
        message: "Custom content selectors (comma-separated, e.g., #app > *):",
        default: "",
      },
    ])
    .then(async (answers) => {
      const routes =
        answers.routes === "auto"
          ? await autoDetectRoutes(answers.inputDir)
          : answers.routes.split(",").map((route) => {
              const match = route.match(/(.+):id\[(.+)\]/);
              if (match) {
                const [, path, ids] = match;
                return {
                  path,
                  params: ids.split(",").map((id) => ({ id: id.trim() })),
                };
              }
              return route.trim();
            });
      return {
        ...answers,
        routes,
        port: parseInt(answers.port, 10),
        concurrency: parseInt(answers.concurrency, 10),
        batchSize: parseInt(answers.batchSize, 10),
        timeout: parseInt(answers.timeout, 10),
        hydrateBundle: answers.hydrateBundle || null,
        excludeRoutes: answers.excludeRoutes ? answers.excludeRoutes.split(",").map((r) => r.trim()) : [],
        customSelectors: answers.customSelectors ? answers.customSelectors.split(",").map((s) => s.trim()) : [],
      };
    });
}

async function saveConfig(config) {
  const configPath = path.join(process.cwd(), "zepsh.config.js");
  if (fs.existsSync(configPath)) return;
  const configContent = `export default {
  ssg: {
    routes: ${JSON.stringify(config.routes, null, 2)},
    basePath: '${config.basePath}',
    baseUrl: '${config.baseUrl}',
    inputDir: '${config.inputDir}',
    outDir: '${config.outDir}',
    port: ${config.port},
    concurrency: ${config.concurrency},
    flatOutput: ${config.flatOutput},
    hydrate: ${config.hydrate},
    framework: '${config.framework}',
    batchSize: ${config.batchSize},
    incremental: ${config.incremental},
    timeout: ${config.timeout},
    inlineCss: ${config.inlineCss},
    sitemap: ${config.sitemap},
    excludeRoutes: ${JSON.stringify(config.excludeRoutes, null, 2)},
    customSelectors: ${JSON.stringify(config.customSelectors, null, 2)},
  },
};`;
  await fs.promises.writeFile(configPath, configContent, "utf-8");
  logInfo(`Saved configuration to '${configPath}'`);
}

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
    const configPath = path.join(process.cwd(), "zepsh.config.js");
    const pkgPath = path.join(process.cwd(), "package.json");
    const hasConfigFile = fs.existsSync(configPath) || (fs.existsSync(pkgPath) && JSON.parse(fs.readFileSync(pkgPath, "utf-8")).zepsh?.ssg);
    const hasCliOptions = Object.keys(options).length > 0;

    if (!hasConfigFile && !hasCliOptions) {
      logInfo("No configuration found. Starting interactive mode ...");
      config = await promptConfig();
      await saveConfig(config);
    } else {
      ({ config } = await loadConfig());
    }

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
      ...(options.noInlineCss !== undefined && { inlineCss: false }),
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
