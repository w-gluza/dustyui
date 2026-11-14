import visuallyHidden from "../styles/visuallyHidden.module.css";

export type Politeness = "polite" | "assertive";

const REGION_READY_DELAY = 100;
const MESSAGE_LIFETIME = 7000;

let container: HTMLElement | undefined;
let regions: Record<Politeness, HTMLElement> | undefined;
let regionsReadyAt = 0;

function createRegion(politeness: Politeness): HTMLElement {
  const region = document.createElement("div");
  region.setAttribute("role", "log");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-relevant", "additions");
  return region;
}

function getHost(): HTMLElement {
  return (
    [...document.querySelectorAll<HTMLElement>("dialog:modal")].at(-1) ??
    document.body
  );
}

function ensureRegions(): Record<Politeness, HTMLElement> {
  const host = getHost();
  if (regions && container?.parentElement === host) {
    return regions;
  }
  if (!regions || !container?.isConnected) {
    container = document.createElement("div");
    container.dataset.dustyAnnouncer = "";
    container.className = visuallyHidden.visuallyHidden ?? "";
    regions = {
      polite: createRegion("polite"),
      assertive: createRegion("assertive"),
    };
    container.append(regions.polite, regions.assertive);
  }
  host.append(container);
  regionsReadyAt = performance.now() + REGION_READY_DELAY;

  return regions;
}

function ignore(): void {
  return undefined;
}

export function readyAnnouncer(): void {
  if (typeof document !== "undefined") {
    ensureRegions();
  }
}

export function announce(
  message: string,
  politeness: Politeness = "polite",
): () => void {
  if (typeof document === "undefined" || message.trim() === "") {
    return ignore;
  }

  const region = ensureRegions()[politeness];
  const delay = Math.max(0, regionsReadyAt - performance.now());

  const timer = setTimeout(() => {
    const entry = document.createElement("div");
    entry.textContent = message;
    region.append(entry);
    setTimeout(() => entry.remove(), MESSAGE_LIFETIME);
  }, delay);

  return () => clearTimeout(timer);
}
