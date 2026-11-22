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
  const modals = [...document.querySelectorAll<HTMLElement>("dialog:modal")];

  return (
    modals.findLast((modal) => modal.contains(document.activeElement)) ??
    modals.at(-1) ??
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

interface QueuedMessage {
  readonly message: string;
  readonly politeness: Politeness;
  readonly home: HTMLElement | undefined;
  entry?: HTMLElement;
  removal?: ReturnType<typeof setTimeout>;
}

const queue: QueuedMessage[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function flush(): void {
  flushTimer = undefined;
  const waiting = queue
    .splice(0)
    .filter((queued) => queued.home?.parentElement);
  if (waiting.length === 0) {
    return;
  }
  queue.push(...waiting);
  const live = ensureRegions();
  const remaining = regionsReadyAt - performance.now();
  if (remaining > 0) {
    flushTimer = setTimeout(flush, remaining);
    return;
  }
  for (const queued of queue.splice(0)) {
    const added = document.createElement("div");
    added.textContent = queued.message;
    live[queued.politeness].append(added);
    queued.entry = added;
    queued.removal = setTimeout(() => {
      added.remove();
    }, MESSAGE_LIFETIME);
  }
}

export function announce(
  message: string,
  politeness: Politeness = "polite",
): () => void {
  if (typeof document === "undefined" || message.trim() === "") {
    return ignore;
  }

  ensureRegions();
  const queued: QueuedMessage = { message, politeness, home: container };
  queue.push(queued);
  clearTimeout(flushTimer);
  flushTimer = setTimeout(
    flush,
    Math.max(0, regionsReadyAt - performance.now()),
  );

  return () => {
    const position = queue.indexOf(queued);
    if (position !== -1) {
      queue.splice(position, 1);
    }
    if (queue.length === 0) {
      clearTimeout(flushTimer);
      flushTimer = undefined;
    }
    clearTimeout(queued.removal);
    queued.entry?.remove();
  };
}
