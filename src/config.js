import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

async function loadConfig() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "zepsh.config.js");
  const pkgPath = path.join(cwd, "package.json");

  let config = {};
  let configSource = "none";

  if (fs.existsSync(configPath)) {
    const configModule = await import(pathToFileURL(configPath).href);
    config = configModule.default.ssg || configModule.ssg;
    configSource = "zepsh.config.js";
  } else {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.zepsh && pkg.zepsh.ssg) {
        config = pkg.zepsh.ssg;
        configSource = "package.json";
      }
    }
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
    inlineCss: true,
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

  return { config, configSource };
}

export { loadConfig };
