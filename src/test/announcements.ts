import type { Politeness } from "../announcer/announcer.js";

export function resetAnnouncer(): void {
  document.querySelector("[data-dusty-announcer]")?.remove();
}

export function announcements(politeness: Politeness = "polite"): string[] {
  const region = document.querySelector(
    `[data-dusty-announcer] [aria-live="${politeness}"]`,
  );
  return [...(region?.children ?? [])].map((entry) => entry.textContent ?? "");
}
