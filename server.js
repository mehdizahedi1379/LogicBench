var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  app.use(import_express.default.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "LogicBench", timestamp: Date.now() });
  });
  app.post("/api/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(401).json({
          error: "GEMINI_API_KEY is not configured on the server. Please add your Gemini API key in AI Studio Secrets."
        });
      }
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt in request body" });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : void 0
      });
      const text = response.text || "No response text generated.";
      return res.json({ text });
    } catch (err) {
      console.error("Gemini API Proxy Error:", err);
      return res.status(500).json({
        error: err?.message || "Internal server error during Gemini inference"
      });
    }
  });
  const distDir = import_node_path.default.resolve(process.cwd(), "dist");
  if (isProduction || !process.env.VITE_DEV_SERVER && import_node_fs.default.existsSync(import_node_path.default.join(distDir, "index.html")) && process.env.NODE_ENV !== "development") {
    console.log(`[Server] Serving production static build from ${distDir}`);
    app.use(import_express.default.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(import_node_path.default.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`LogicBench server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? "production" : "development"})`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
