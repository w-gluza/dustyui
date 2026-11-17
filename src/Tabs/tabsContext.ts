import { createContext, use } from "react";

export type TabsVariant = "connected" | "underline" | "pill";
export type TabsActivation = "automatic" | "manual";

export interface TabsContextValue {
  baseId: string;
  value: string;
  variant: TabsVariant;
  activation: TabsActivation;
  select: (value: string) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs(part: string): TabsContextValue {
  const context = use(TabsContext);

  if (!context) {
    throw new Error(`${part} must be rendered inside Tabs`);
  }
  return context;
}

function idPart(value: string): string {
  return value.replace(/\s+/gu, "-");
}

export function tabId(baseId: string, value: string): string {
  return `${baseId}-tab-${idPart(value)}`;
}

export function panelId(baseId: string, value: string): string {
  return `${baseId}-panel-${idPart(value)}`;
}
