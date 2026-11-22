import type { Politeness } from "../announcer/announcer.js";

const PENDING_ANNOUNCEMENT_WINDOW = 250;

export function resetAnnouncer(): void {
  document.querySelector("[data-dusty-announcer]")?.remove();
}

export async function settleAnnouncer(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, PENDING_ANNOUNCEMENT_WINDOW),
  );
  resetAnnouncer();
}

export function announcements(politeness: Politeness = "polite"): string[] {
  const region = document.querySelector(
    `[data-dusty-announcer] [aria-live="${politeness}"]`,
  );
  return [...(region?.children ?? [])].map((entry) => entry.textContent ?? "");
}
