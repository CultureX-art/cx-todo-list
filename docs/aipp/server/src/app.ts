import express from "express";
import { healthRouter } from "./routes/health.js";

export function buildApp() {
  const app = express();
  app.use(express.json());

  // Simple request-scoped correlation id
  app.use((req, _res, next) => {
    (req as any).correlationId = req.headers["x-correlation-id"] || `cid-${Date.now()}`;
    next();
  });

  app.use("/health", healthRouter);
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = buildApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: "info", msg: "server_started", port }));
  });
}
