import visuallyHidden from "../styles/visuallyHidden.module.css";

export type Politeness = "polite" | "assertive";

const REGION_READY_DELAY = 100;
const MESSAGE_LIFETIME = 7000;

let regions: Record<Politeness, HTMLElement> | undefined;
let regionsReadyAt = 0;

function createRegion(politeness: Politeness): HTMLElement {
  const region = document.createElement("div");
  region.setAttribute("role", "log");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-relevant", "additions");
  return region;
}

function ensureRegions(): Record<Politeness, HTMLElement> {
  if (regions?.polite.isConnected && regions.assertive.isConnected) {
    return regions;
  }

  const container = document.createElement("div");
  container.dataset.dustyAnnouncer = "";
  container.className = visuallyHidden.visuallyHidden ?? "";

  regions = {
    polite: createRegion("polite"),
    assertive: createRegion("assertive"),
  };
  container.append(regions.polite, regions.assertive);
  document.body.append(container);
  regionsReadyAt = performance.now() + REGION_READY_DELAY;

  return regions;
}

export function announce(
  message: string,
  politeness: Politeness = "polite",
): void {
  if (typeof document === "undefined" || message.trim() === "") {
    return;
  }

  const region = ensureRegions()[politeness];
  const delay = Math.max(0, regionsReadyAt - performance.now());

  setTimeout(() => {
    const entry = document.createElement("div");
    entry.textContent = message;
    region.append(entry);
    setTimeout(() => entry.remove(), MESSAGE_LIFETIME);
  }, delay);
}
