export function getEnabledTabs(list: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    list.querySelectorAll<HTMLButtonElement>('button[role="tab"]:enabled'),
  ).filter((tab) => tab.closest('[role="tablist"]') === list);
}
