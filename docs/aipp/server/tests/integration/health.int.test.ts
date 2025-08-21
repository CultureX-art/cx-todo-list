import request from "supertest";
import { buildApp } from "../../src/app.js";

describe("GET /health (integration)", () => {
  it("returns ok with correlationId", async () => {
    const app = buildApp();
    const res = await request(app).get("/health").set("x-correlation-id", "cid-int");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.correlationId).toBe("cid-int");
  });
});
