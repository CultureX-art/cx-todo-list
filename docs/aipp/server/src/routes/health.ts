import { Router } from "express";
export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  const correlationId = (req as any).correlationId;
  res.status(200).json({ status: "ok", correlationId });
});
