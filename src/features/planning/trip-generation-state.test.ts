import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingTripGeneration,
  loadPendingTripGeneration,
  savePendingTripGeneration,
} from "./trip-generation-state";

describe("pending trip generation persistence", () => {
  beforeEach(() => localStorage.clear());

  it("restores an in-flight job after React state is lost on refresh", () => {
    savePendingTripGeneration(42, {
      generationId: "job-1",
      startedAt: 1_000,
      destination: "Đà Nẵng",
      analyticsPayload: { destination: "Đà Nẵng", peopleCount: 2 },
    });

    expect(loadPendingTripGeneration(42, 2_000)).toEqual({
      generationId: "job-1",
      startedAt: 1_000,
      destination: "Đà Nẵng",
      analyticsPayload: { destination: "Đà Nẵng", peopleCount: 2 },
    });
  });

  it("does not restore another user's job", () => {
    savePendingTripGeneration(42, {
      generationId: "job-1",
      startedAt: 1_000,
      destination: "Huế",
      analyticsPayload: {},
    });

    expect(loadPendingTripGeneration(7, 2_000)).toBeNull();
  });

  it("clears the marker after the job reaches a terminal state", () => {
    savePendingTripGeneration(42, {
      generationId: "job-1",
      startedAt: 1_000,
      destination: "Đà Lạt",
      analyticsPayload: {},
    });

    clearPendingTripGeneration(42);

    expect(loadPendingTripGeneration(42, 2_000)).toBeNull();
  });
});
