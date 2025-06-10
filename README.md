# **JepshSSG** - Static Site Generator

**JepshSSG** is a powerful static site generator that crawls modern web applications ([**JepshJS**](https://github.com/jepsh/jepsh), **React**, **Vue**, **Svelte**) and generates static HTML files for improved performance and SEO. It supports dynamic routes, sitemap generation, incremental builds, and provides a sleek CLI experience with interactive configuration.

> This is a built-in tool for the [**JepshJS**](https://github.com/jepsh/jepsh) web framework.

## Why **JepshSSG**?

Static site generation transforms your dynamic single-page applications into pre-rendered HTML files, providing numerous benefits:

- **Performance**: Pre-rendered pages load instantly, reducing time-to-first-byte
- **SEO Optimization**: Search engines can easily crawl and index static HTML content
- **Better Core Web Vitals**: Improved LCP, FID, and CLS scores
- **Cost Effective**: Serve static files from CDNs with minimal server resources
- **Enhanced Security**: No server-side vulnerabilities in static files

## Features

- **Dynamic Routes**: Full support for parameterized routes (e.g., `/users/:id`, `/blog/:slug`)
- **Sitemap Generation**: Automatically creates `sitemap.xml` for enhanced SEO
- **Incremental Builds**: Smart caching system skips unchanged routes for faster builds
- **Watch Mode**: Automatically rebuilds when source files change
- **Auto-Route Detection**: Intelligently infers routes from your input directory structure
- **Hydration Support**: Seamlessly injects client-side JavaScript for interactivity
- **Debug Tools**: Comprehensive debugging with screenshots and detailed logs
- **Flexible Configuration**: Multiple configuration methods with clear precedence
- **Interactive CLI**: User-friendly prompts guide you through setup
- **CSS Optimization**: Built-in CSS inlining with Critters for performance

## Installation

### Global Installation (Recommended)

```bash
npm install -g jepsh-ssg
```

### Local Installation

```bash
npm install jepsh-ssg --save-dev
npx jepsh-ssg
```

### Using with Different Package Managers

```bash
# Using Yarn
yarn global add jepsh-ssg
# or locally
yarn add -D jepsh-ssg

# Using pnpm
pnpm add -g jepsh-ssg
# or locally
pnpm add -D jepsh-ssg
```

## Quick Start

1. **Build your application** (React, Vue, Svelte, or JepshJS)
2. **Run JepshSSG** to generate static files:

```bash
npx jepsh-ssg
```

3. **Deploy** the generated static files to any hosting platform

### Example Workflow

```bash
# Build your React/Vue/Svelte app
npm run build

# Generate static site
npx jepsh-ssg --routes /,/about,/contact --sitemap --base-url https://mysite.com

# Deploy (example with Netlify)
netlify deploy --prod --dir=build-ssg
```

## Configuration

**JepshSSG** offers flexible configuration with the following precedence order:

1. **CLI Flags** (highest priority)
2. **Configuration File** (`jepsh.config.js` or `package.json`)
3. **Interactive Prompts** (when no config is found)

---

### 1. CLI Flags

**Basic Usage:**

```bash
npx jepsh-ssg --routes /,/about --port 5000 --out-dir static
```

**Advanced Usage with Hydration:**

```bash
npx jepsh-ssg --hydrate --hydrate-bundle assets/js/main.js --sitemap --base-url https://example.com
```

**Complete Flag Reference:**

| Flag                             | Description                                                   | Corresponding Field |
| -------------------------------- | ------------------------------------------------------------- | ------------------- |
| `--routes <routes>`              | Comma-separated routes or 'auto' for auto-detection           | `routes`            |
| `--base-path <path>`             | Base path prefix for all routes                               | `basePath`          |
| `--base-url <url>`               | Base URL for sitemap generation (e.g., `https://example.com`) | `baseUrl`           |
| `-i, --input-dir <path>`         | Input directory containing built files                        | `inputDir`          |
| `-o, --out-dir <path>`           | Output directory for generated static files                   | `outDir`            |
| `-p, --port <number>`            | Development server port (1-65535)                             | `port`              |
| `--concurrency <number>`         | Number of concurrent crawling processes                       | `concurrency`       |
| `--flat-output`                  | Generate `page.html` instead of `page/index.html`             | `flatOutput`        |
| `--hydrate`                      | Enable client-side hydration (experimental)                   | `hydrate`           |
| `--hydrate-bundle <path>`        | Path to hydration bundle (relative to input directory)        | `hydrateBundle`     |
| `--framework <name>`             | Target framework: `react`, `vite`, `vue`, or `svelte`         | `framework`         |
| `--batch-size <number>`          | Number of routes to process per batch                         | `batchSize`         |
| `--incremental`                  | Enable incremental builds with caching (experimental)         | `incremental`       |
| `-t, --timeout <number>`         | Timeout per route in milliseconds                             | `timeout`           |
| `--inline-css`                   | Enable CSS inlining optimization                              | `inlineCss`         |
| `--sitemap`                      | Generate sitemap.xml (recommended for SEO)                    | `sitemap`           |
| `--exclude-routes <routes>`      | Comma-separated routes to exclude from generation             | `excludeRoutes`     |
| `--custom-selectors <selectors>` | Custom CSS selectors for content extraction                   | `customSelectors`   |
| `--watch`                        | Watch for file changes and rebuild automatically              | -                   |
| `--dry-run`                      | Preview routes without generating files                       | -                   |
| `-V, --version`                  | Display version information                                   | -                   |
| `-h, --help`                     | Show help information                                         | -                   |
| `--clear-cache`                  | Clear cached data in `.jepsh`                                 | -                   |
| `--clear-logs`                   | Clear logs in `.jepsh`                                        | -                   |
| `--clean`                        | Clear all cache and logs in `.jepsh`                          | -                   |

> **💡 Tip**: When using `--sitemap`, always specify `--base-url` for proper SEO. Without it, URLs will default to `https://localhost:3000`.

---

### 2. Configuration File

#### Using `jepsh.config.js` (Recommended)

```javascript
export default {
  ssg: {
    routes: ["/", "/about", "/contact"],
    inputDir: "dist",
    outDir: "dist-ssg",
    baseUrl: "https://mysite.com",
    sitemap: true,
    framework: "react",
    concurrency: 5,
    timeout: 45000,
    hydrate: true,
    hydrateBundle: "assets/js/bundle.js",
  },
};
```

#### Using `package.json`

```json
{
  "name": "my-app",
  "scripts": {
    "build": "vite build",
    "ssg": "jepsh-ssg"
  },
  "jepsh": {
    "ssg": {
      "routes": ["/", "/about", "/contact"],
      "inputDir": "dist",
      "outDir": "dist-ssg",
      "baseUrl": "https://mysite.com",
      "sitemap": true
    }
  }
}
```

#### Dynamic Routes Configuration

For applications with dynamic routes, use objects with `path` and `params`:

```javascript
export default {
  ssg: {
    routes: [
      "/",
      "/about",
      {
        path: "/users/:id",
        params: [{ id: "1" }, { id: "2" }, { id: "admin" }],
      },
      {
        path: "/blog/:category/:slug",
        params: [
          { category: "tech", slug: "react-tips" },
          { category: "design", slug: "ui-patterns" },
        ],
      },
    ],
    // ... other configuration
  },
};
```

#### Complete Configuration Reference

| Field             | Type                                           | Description                                  | Default                   | CLI Flag             |
| ----------------- | ---------------------------------------------- | -------------------------------------------- | ------------------------- | -------------------- |
| `routes`          | `string[]` \| `object[]`                       | Routes to crawl or 'auto' for detection      | `['/']`                   | `--routes`           |
| `basePath`        | `string`                                       | Base path prefix for routes                  | `''`                      | `--base-path`        |
| `baseUrl`         | `string`                                       | Base URL for sitemap and canonical URLs      | `'http://localhost:3000'` | `--base-url`         |
| `inputDir`        | `string`                                       | Directory containing built application files | `'build'`                 | `-i, --input-dir`    |
| `outDir`          | `string`                                       | Output directory for static files            | `'build-ssg'`             | `-o, --out-dir`      |
| `port`            | `number`                                       | Development server port                      | `3000`                    | `-p, --port`         |
| `concurrency`     | `number`                                       | Concurrent crawling processes                | `3`                       | `--concurrency`      |
| `flatOutput`      | `boolean`                                      | Flat file structure vs. directory structure  | `false`                   | `--flat-output`      |
| `hydrate`         | `boolean`                                      | Enable client-side hydration (experimental)  | `false`                   | `--hydrate`          |
| `hydrateBundle`   | `string`                                       | Path to hydration JavaScript bundle          | `null`                    | `--hydrate-bundle`   |
| `framework`       | `'react'` \| `'vite'` \| `'vue'` \| `'svelte'` | Target framework for optimization            | `'react'`                 | `--framework`        |
| `batchSize`       | `number`                                       | Routes processed per batch                   | `50`                      | `--batch-size`       |
| `incremental`     | `boolean`                                      | Enable incremental builds (experimental)     | `false`                   | `--incremental`      |
| `timeout`         | `number`                                       | Timeout per route in milliseconds            | `30000`                   | `-t, --timeout`      |
| `inlineCss`       | `boolean`                                      | Enable CSS inlining with Critters            | `false`                   | `--inline-css`       |
| `sitemap`         | `boolean`                                      | Generate sitemap.xml                         | `false`                   | `--sitemap`          |
| `excludeRoutes`   | `string[]`                                     | Routes to exclude from generation            | `[]`                      | `--exclude-routes`   |
| `customSelectors` | `string[]`                                     | Custom CSS selectors for content             | `[]`                      | `--custom-selectors` |

> **⚠️ Note**: CLI flags always override configuration file settings. Features like `--watch` and `--dry-run` are CLI-only but can be combined with file configuration.

---

### 3. Interactive Configuration

When no configuration is detected, **JepshSSG** launches an interactive setup wizard:

```bash
npx jepsh-ssg

? Input directory (where your built files are located): dist
? Output directory (where static files will be saved): dist-ssg
? Server port (1-65535): 3000
? Routes to crawl (comma-separated or 'auto'): /,/about,/users/:id[1,2,3]
? Enable sitemap generation? (Y/n): Y
? Base URL for sitemap: https://mysite.com
? Framework (react/vite/vue/svelte): react
? Enable CSS inlining? (Y/n): Y
? Concurrency level (1-10): 3
```

The wizard saves your preferences and generates a configuration file for future use.

## Advanced Features

### 1. Sitemap Generation

**JepshSSG** automatically generates SEO-optimized sitemaps with proper lastmod timestamps and canonical URLs.

**Enable sitemap generation:**

```bash
npx jepsh-ssg --sitemap --base-url https://mysite.com
```

**Generated `sitemap.xml` example:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mysite.com/</loc>
    <lastmod>2025-05-30T04:42:18.000Z</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mysite.com/about</loc>
    <lastmod>2025-05-30T04:42:18.000Z</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mysite.com/users/1</loc>
    <lastmod>2025-05-30T04:42:18.000Z</lastmod>
    <priority>0.6</priority>
  </url>
</urlset>
```

### 2. Incremental Builds

Dramatically reduce build times by only regenerating changed routes. **JepshSSG** maintains a cache of file hashes to detect changes.

**Enable incremental builds:**

```bash
npx jepsh-ssg --incremental
```

**How it works:**

- Calculates checksums for source files
- Stores metadata in `.jepsh/caches/ssg.json`
- Skips unchanged routes on subsequent builds
- Automatically handles dependency changes

> **⚠️ Experimental**: This feature is under active development. Please report issues on our [GitHub repository](https://github.com/jepsh/jepsh-ssg/issues).

### 3. Debug and Development Tools

**JepshSSG** provides comprehensive debugging capabilities for troubleshooting generation issues.

**Debug folder structure:**

```
.jepsh/
├── caches/
│   └── ssg.json                 # Incremental build cache
└── debug/
    ├── logs/
    │   └── ssg.log              # Detailed operation logs
    └── screenshots/
        └── ssg/
            ├── _.png            # Homepage screenshot
            ├── _about.png       # About page screenshot
            └── _users_1.png     # Dynamic route screenshot
```

**Add to `.gitignore`:**

```gitignore
# Dependencies
/node_modules/

# JepshSSG debug and cache files
/.jepsh/

# Environment files
.env*
```

### 4. Watch Mode

Automatically rebuild when source files change during development:

```bash
npx jepsh-ssg --watch
```

Perfect for development workflows where you want to see static generation results in real-time.

### 5. Hydration Support (Experimental)

Add client-side interactivity to your static pages:

```bash
npx jepsh-ssg --hydrate --hydrate-bundle assets/js/app.js
```

**How hydration works:**

1. Generates static HTML for fast initial load
2. Injects specified JavaScript bundle
3. Re-hydrates components for full interactivity
4. Maintains SEO benefits with dynamic functionality

## Framework-Specific Examples

### React with CRA

```bash
# Build React app
npm run build

# Generate static site
npx jepsh-ssg --framework react --input-dir build
```

### React with Vite

```bash
# Build React app
npm run build

# Generate static site
npx jepsh-ssg --framework vite --input-dir dist --sitemap --base-url https://myapp.com
```

### Vue with Nuxt

```bash
# Build Vue app
npm run generate

# Generate static site
npx jepsh-ssg --framework vue --input-dir .output/public --routes auto
```

### Svelte with SvelteKit

```bash
# Build Svelte app
npm run build

# Generate static site
npx jepsh-ssg --framework svelte --input-dir build --hydrate
```

## Performance Optimization

### CSS Optimization

**JepshSSG** uses [Critters](https://github.com/GoogleChromeLabs/critters) to inline critical CSS:

- Automatically inlines above-the-fold CSS
- Lazy-loads non-critical stylesheets
- Reduces render-blocking resources
- Improves Core Web Vitals scores

### Batch Processing

Configure batch processing for optimal performance:

```bash
# Process 20 routes at a time with 5 concurrent workers
npx jepsh-ssg --batch-size 20 --concurrency 5
```

### Memory Management

For large sites, tune memory usage:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npx jepsh-ssg
```

## Logging and Reporting

**JepshSSG** provides detailed logging and comprehensive reports:

```
  ███████╗███████╗██████╗ ███████╗██╗  ██╗
  ╚══███╔╝██╔════╝██╔══██╗██╔════╝██║  ██║
    ███╔╝ █████╗  ██████╔╝███████╗███████║
   ███╔╝  ██╔══╝  ██╔═══╝ ╚════██║██╔══██║
  ███████╗███████╗██║     ███████║██║  ██║
  ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
  v1.0.17

• Configuration
  Routes      : 15 routes (3 dynamic)
  Input       : dist
  Output      : dist-ssg
  Port        : 3000
  Framework   : react
  Started     : 5/30/2025, 7:05:18 PM

+ [7:05:18 PM]  INFO     Serving dist at http://localhost:3000
✔ [7:05:19 PM]  SUCCESS  Copied 'dist' → 'dist-ssg' (2.3 MB)
+ [7:05:20 PM]  INFO     Processing batch 1/3 (5 routes)...
+ [7:05:24 PM]  SUCCESS  CSS inlined for 5 routes
✔ [7:05:24 PM]  SUCCESS  Batch 1/3 completed
+ [7:05:25 PM]  INFO     Processing batch 2/3 (5 routes)...
✔ [7:05:28 PM]  SUCCESS  Batch 2/3 completed
+ [7:05:29 PM]  INFO     Processing batch 3/3 (5 routes)...
✔ [7:05:32 PM]  SUCCESS  Batch 3/3 completed
+ [7:05:32 PM]  INFO     Cache saved: '.jepsh/caches/ssg.json'
+ [7:05:32 PM]  SUCCESS  Generated sitemap: 'dist-ssg/sitemap.xml'
✔ [7:05:32 PM]  SUCCESS  Crawling finished

• Reports
  Successful  : 15 routes
  Failed      : 0 routes
  Total       : 15 routes
  Skipped     : 2 routes (excluded)

• Performance
  Duration    : 14.2s
  Average     : 0.95s per route
  Cache hits  : 3 routes
  File size   : 4.7 MB generated

+ [7:05:32 PM]  SUCCESS  All 15 route(s) processed successfully
+ [7:05:32 PM]  SUCCESS  Done!
```

## Troubleshooting

### Common Issues

**1. Routes not found**

```bash
# Enable debug mode and check auto-detection
npx jepsh-ssg --routes auto --dry-run
```

**2. Build fails with timeout**

```bash
# Increase timeout for complex pages
npx jepsh-ssg --timeout 60000
```

**3. Memory issues**

```bash
# Reduce concurrency and batch size
npx jepsh-ssg --concurrency 1 --batch-size 10
```

**4. CSS not loading**

```bash
# Enable CSS inlining if needed
npx jepsh-ssg --inline-css
```

### Debug Information

Check debug logs for detailed information:

```bash
# View debug logs
cat .jepsh/debug/logs/ssg.log

# View generated screenshots
ls .jepsh/debug/screenshots/ssg/
```

## Integration Examples

### GitHub Actions

```yaml
name: Deploy Static Site

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate static site
        run: npx jepsh-ssg --sitemap --base-url https://mysite.com

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build-ssg
```

### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build && npx jepsh-ssg --sitemap --base-url https://mysite.netlify.app"
  publish = "build-ssg"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build && npx jepsh-ssg --sitemap --base-url https://mysite.vercel.app",
  "outputDirectory": "build-ssg",
  "framework": null
}
```

## Migration Guide

### From Gatsby

```bash
# Replace gatsby build with:
npm run build  # Your normal build command
npx jepsh-ssg --routes auto --sitemap --base-url https://yoursite.com
```

### From Next.js Static Export

```bash
# Replace next export with:
npm run build
npx jepsh-ssg --framework react --routes auto --sitemap
```

### From Nuxt Generate

```bash
# Replace nuxt generate with:
npm run build
npx jepsh-ssg --framework vue --input-dir .output/public --routes auto
```

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/jepsh-ssg.git`
3. **Install** dependencies: `npm install`
4. **Create** a feature branch: `git checkout -b feature/amazing-feature`
5. **Make** your changes and add tests
6. **Test** your changes: `npm test`
7. **Commit** your changes: `git commit -m 'Add amazing feature'`
8. **Push** to your branch: `git push origin feature/amazing-feature`
9. **Create** a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jepsh/jepsh-ssg.git
cd jepsh-ssg

# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev
```

### Code Style

We use ESLint and Prettier for code formatting. Before submitting:

```bash
npm run lint      # Check code style
npm run lint:fix  # Auto-fix issues
npm run format    # Format code
```

Please read our [Contributing Guidelines](https://github.com/jepsh/.github/blob/main/CONTRIBUTING.md) for detailed information about our development process, issue reporting, and pull request procedures.

## License

**Apache-2.0 License** - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [**JepshSSG** Docs](https://jepsh.github.io/jepsh-ssg)
- **Bug Reports**: [GitHub Issues](https://github.com/jepsh/jepsh-ssg/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jepsh/jepsh-ssg/discussions)
- **Feature Requests**: [GitHub Issues](https://github.com/jepsh/jepsh-ssg/issues/new?template=feature_request.md)

---

[⭐ Star us on GitHub](https://github.com/jepsh/jepsh-ssg) if you find **JepshSSG** helpful!
