import { expect } from "chai";
import sinon from "sinon";
import fs, { mkdirSync, existsSync, rmSync } from "fs";
import * as utils from "../src/utils.js";

describe("utils.js", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("getMimeType", () => {
    it("should return correct MIME types", () => {
      expect(utils.getMimeType("index.html")).to.equal("text/html");
      expect(utils.getMimeType("style.css")).to.equal("text/css");
      expect(utils.getMimeType("script.js")).to.equal("text/javascript");
      expect(utils.getMimeType("image.png")).to.equal("image/png");
      expect(utils.getMimeType("font.woff2")).to.equal("font/woff2");
    });

    it("should return default MIME type for unknown extensions", () => {
      expect(utils.getMimeType("file.unknown")).to.equal("application/octet-stream");
    });
  });

  describe("logLabel", () => {
    it("should return colored label strings", () => {
      expect(utils.logLabel("info")).to.include("INFO");
      expect(utils.logLabel("success")).to.include("SUCCESS");
      expect(utils.logLabel("warn")).to.include("WARN");
      expect(utils.logLabel("error")).to.include("ERROR");
    });
  });

  describe("logStamp", () => {
    it("should return a timestamp string", () => {
      const stamp = utils.logStamp();
      expect(stamp).to.match(/\[\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe("logInfo / logSuccess / logWarn / logError", () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(console, "log");
    });

    afterEach(() => {
      sinon.restore();
    });

    describe("logInfo", () => {
      it("should log info message with correct format", () => {
        utils.logInfo("Test info message");
        expect(consoleLogStub.calledOnce).to.be.true;

        const loggedArgs = consoleLogStub.firstCall.args;
        expect(loggedArgs[0]).to.include("INFO");
        expect(loggedArgs[0]).to.include("Test info message");
      });

      it("should handle additional arguments", () => {
        utils.logInfo("Test with args", { data: "test" }, 123);
        expect(consoleLogStub.calledOnce).to.be.true;

        const loggedArgs = consoleLogStub.firstCall.args;
        expect(loggedArgs).to.have.length(3);
        expect(loggedArgs[1]).to.deep.equal({ data: "test" });
        expect(loggedArgs[2]).to.equal(123);
      });
    });

    describe("logSuccess", () => {
      it("should log success message with correct format", () => {
        utils.logSuccess("Operation completed");
        expect(consoleLogStub.calledOnce).to.be.true;

        const loggedContent = consoleLogStub.firstCall.args[0];
        expect(loggedContent).to.include("SUCCESS");
        expect(loggedContent).to.include("Operation completed");
      });
    });

    describe("logWarn", () => {
      it("should log warning message with correct format", () => {
        utils.logWarn("Warning message");
        expect(consoleLogStub.calledOnce).to.be.true;

        const loggedContent = consoleLogStub.firstCall.args[0];
        expect(loggedContent).to.include("WARN");
        expect(loggedContent).to.include("Warning message");
      });
    });

    describe("logError", () => {
      it("should log error message with correct format", () => {
        utils.logError("Error occurred");
        expect(consoleLogStub.calledOnce).to.be.true;

        const loggedContent = consoleLogStub.firstCall.args[0];
        expect(loggedContent).to.include("ERROR");
        expect(loggedContent).to.include("Error occurred");
      });
    });
  });

  describe("generateSitemap", () => {
    const tmpDir = ".tmp-test";

    beforeEach(() => {
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should write sitemap.xml with correct routes", async () => {
      const routes = ["/", "/about", { path: "/user/:id", params: [{ id: "1" }, { id: "2" }] }];
      const baseUrl = "https://example.com";
      const basePath = "/app";

      const sitemapPath = await utils.generateSitemap(routes, baseUrl, tmpDir, basePath);
      const content = fs.readFileSync(sitemapPath, "utf-8");

      expect(content).to.include("<loc>https://example.com/app/user/1</loc>");
      expect(content).to.include("<loc>https://example.com/app/user/2</loc>");
      expect(sitemapPath).to.include("sitemap.xml");
    });
  });

  describe("createSpinner", () => {
    it("should return an ora spinner instance", () => {
      const spinner = utils.createSpinner("Test spinner");
      expect(spinner).to.have.property("start");
      spinner.stop();
    });
  });
});
