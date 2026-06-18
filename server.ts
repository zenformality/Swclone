import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";
import { Client, handle_file } from "@gradio/client";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Set up disk storage for multer instead of memory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // 1. Clone Voice endpoint (just saves the file and returns the ID)
  app.post("/api/clone-voice", upload.single("sampleFile"), async (req, res) => {
    try {
      const { name } = req.body;
      const file = req.file;

      if (!name || !file) {
        return res.status(400).json({ error: "Missing 'name' or 'sampleFile' in request." });
      }

      // We just use the filename as the voiceId
      const voiceId = file.filename;
      return res.json({ voiceId: voiceId });
    } catch (error: any) {
      console.error("/api/clone-voice error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // 2. Synthesize Speech endpoint (Uses Gradio API)
  app.post("/api/synthesize", async (req, res) => {
    try {
      const { voiceId, text } = req.body;

      if (!voiceId || !text) {
        return res.status(400).json({ error: "Missing 'voiceId' or 'text' in request." });
      }

      const filePath = path.join(UPLOADS_DIR, voiceId);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Voice profile audio not found." });
      }

      console.log(`Connecting to TonyAssi/Voice-Clone for voice ID ${voiceId}...`);
      const gradioApp = await Client.connect("TonyAssi/Voice-Clone");
      
      console.log(`Predicting speech for text: "${text.substring(0, 50)}..."`);
      
      // The endpoint "/clone" expects text (string) and audio (file)
      const result = await gradioApp.predict("/clone", {
        text: text,
        audio: handle_file(filePath) // pass the file reference
      }) as any;

      // The result format based on API inspection is:
      // result.data[0] is the output file object (contains path/url)
      const fileResult = result.data ? result.data[0] : result[0];
      
      if (!fileResult || !fileResult.url) {
         console.error("Unexpected Gradio output:", result);
         throw new Error("Invalid output received from the voice cloning model.");
      }
      
      // Fetch the generated audio from the Gradio space's URL
      const audioResponse = await fetch(fileResult.url);
      if (!audioResponse.ok) {
         throw new Error("Failed to fetch generated audio from the remote node.");
      }
      
      res.setHeader("Content-Type", "audio/wav");
      const arrayBuffer = await audioResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
      
    } catch (error: any) {
      console.error("/api/synthesize error:", error);
      res.status(500).json({ error: error.message || "Internal server error. Note: The free Hugging Face API used might be busy or unavailable." });
    }
  });


  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
