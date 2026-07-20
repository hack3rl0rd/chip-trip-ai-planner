import { act, type PropsWithChildren } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savePendingTripGeneration } from "@/features/planning/trip-generation-state";
import Planning from "./Planning";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/Navbar", () => ({ default: () => <div>Navbar</div> }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: PropsWithChildren) => <div>{children}</div> },
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 42, email: "test@chiptrip.vn" }, loading: false }),
}));
vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
  useInvalidateEntitlements: () => vi.fn(),
}));
vi.mock("@/features/planning/usePlaceAutocomplete", () => ({
  usePlaceAutocomplete: () => ({ predictions: [] }),
}));
vi.mock("@/integrations/api", () => ({
  tripsApi: { getGenerationStatus: vi.fn(() => new Promise(() => {})) },
  aiApi: {},
  placesApi: {},
}));

describe("Planning generation recovery", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("shows the loading screen again after remount instead of returning to step one", async () => {
    savePendingTripGeneration(42, {
      generationId: "job-refresh",
      startedAt: Date.now(),
      destination: "Đà Nẵng",
      analyticsPayload: { destination: "Đà Nẵng" },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/planning"]}>
          <Planning />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain("AI đang tạo lịch trình");
    expect(container.textContent).toContain("Đà Nẵng");
    expect(container.textContent).not.toContain("Bạn đã có điểm đến chưa");
  });
});
