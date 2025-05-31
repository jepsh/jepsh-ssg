import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import inquirer from "inquirer";

import { logInfo } from "./utils.js";

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
        default: false,
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

async function loadConfig() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "zepsh.config.js");
  const pkgPath = path.join(cwd, "package.json");
  let config = {};
  if (fs.existsSync(configPath)) {
    const configModule = await import(pathToFileURL(configPath).href);
    config = configModule.default.ssg || configModule.ssg;
  }
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg.zepsh && pkg.zepsh.ssg) config = pkg.zepsh.ssg;
  }
  if (!fs.existsSync(configPath) && fs.existsSync(pkgPath)) {
    logInfo("No configuration found. Starting interactive mode ...");
    config = await promptConfig();
    await saveConfig(config);
  }

  const defaultConfig = {
    routes: ["/"],
    basePath: "",
    baseUrl: "http://localhost:3000",
    inputDir: "build",
    outDir: "build-ssg",
    port: 3000,
    concurrency: 3,
    flatOutput: false,
    hydrate: false,
    hydrateBundle: null,
    framework: "react",
    batchSize: 50,
    incremental: false,
    timeout: 30000,
    inlineCss: false,
    sitemap: false,
    excludeRoutes: [],
    customSelectors: [],
  };

  config = { ...defaultConfig, ...config };

  if (!Array.isArray(config.routes) || config.routes.length === 0) {
    throw new Error("Routes must be a non-empty array");
  }
  if (config.baseUrl && !/^(http|https):\/\/[^ "]+$/.test(config.baseUrl)) {
    throw new Error(`Invalid baseUrl: '${config.baseUrl}'`);
  }
  if (!config.inputDir || !fs.existsSync(config.inputDir)) {
    throw new Error(`Input directory '${config.inputDir}' does not exist`);
  }
  if (!fs.existsSync(path.join(config.inputDir, "index.html"))) {
    throw new Error(`No index.html found in '${config.inputDir}'`);
  }
  if (typeof config.concurrency !== "number" || config.concurrency < 1) {
    throw new Error("Concurrency must be a positive number");
  }
  if (config.hydrateBundle !== null && typeof config.hydrateBundle !== "string") {
    throw new Error("hydrateBundle must be a string or null");
  }
  if (!["react", "vue", "svelte"].includes(config.framework)) {
    throw new Error("Framework must be one of: react, vue, svelte");
  }
  if (typeof config.batchSize !== "number" || config.batchSize < 1) {
    throw new Error("Batch size must be a positive number");
  }
  if (typeof config.timeout !== "number" || config.timeout < 1) {
    throw new Error("Timeout must be a positive number");
  }
  if (!Array.isArray(config.excludeRoutes)) {
    throw new Error("excludeRoutes must be an array");
  }
  if (!Array.isArray(config.customSelectors)) {
    throw new Error("customSelectors must be an array");
  }

  return config;
}

export { loadConfig };
