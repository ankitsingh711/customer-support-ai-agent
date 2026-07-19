import { describe, expect, it } from "vitest";
import { shouldEscalate } from "../src/services/ragService.js";

describe("shouldEscalate", () => {
  it("escalates when confidence is below threshold", () => {
    expect(shouldEscalate(0.3, false, 0.55)).toBe(true);
  });

  it("does not escalate when confidence meets threshold and model is confident", () => {
    expect(shouldEscalate(0.9, false, 0.55)).toBe(false);
  });

  it("escalates when the model flags needs_human regardless of confidence", () => {
    expect(shouldEscalate(0.95, true, 0.55)).toBe(true);
  });

  it("treats the threshold as exclusive on the low side", () => {
    expect(shouldEscalate(0.55, false, 0.55)).toBe(false);
    expect(shouldEscalate(0.549, false, 0.55)).toBe(true);
  });
});
