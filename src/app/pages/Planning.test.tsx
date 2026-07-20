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

describe("Planning", () => {
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

  it("shows popular place suggestions from all three regions", async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/planning"]}>
          <Planning />
        </MemoryRouter>,
      );
    });

    const knownDestinationButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Có rồi"));
    expect(knownDestinationButton).toBeDefined();

    await act(async () => {
      knownDestinationButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const originInput = container.querySelector<HTMLInputElement>('input[placeholder="Điểm đi"]');
    expect(originInput).not.toBeNull();

    await act(async () => {
      originInput?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });

    const suggestionList = container.querySelector('[role="listbox"]');
    expect(suggestionList).not.toBeNull();
    expect(suggestionList?.querySelectorAll('[role="option"]')).toHaveLength(30);
    expect(suggestionList?.textContent).toContain("Miền Bắc");
    expect(suggestionList?.textContent).toContain("Miền Trung");
    expect(suggestionList?.textContent).toContain("Miền Nam");
    expect(suggestionList?.textContent).toContain("Phú Quốc");

    const phuQuocOption = Array.from(suggestionList?.querySelectorAll("button") ?? [])
      .find((button) => button.textContent?.includes("Phú Quốc"));
    expect(phuQuocOption).toBeDefined();

    await act(async () => {
      phuQuocOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(originInput?.value).toBe("Phú Quốc");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
