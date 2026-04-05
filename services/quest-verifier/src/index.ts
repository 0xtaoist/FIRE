import express from "express";
import cors from "cors";
import apiRouter from "./api";
import { startVerificationLoop } from "./verifier";

const app = express();
const PORT = process.env.QUEST_PORT || 4001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Quest API routes
app.use(apiRouter);

app.listen(PORT, () => {
  console.log(`[quest-verifier] Listening on port ${PORT}`);
  startVerificationLoop();
});
