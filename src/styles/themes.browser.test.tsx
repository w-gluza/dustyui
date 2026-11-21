import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ExpandableCard, Popover } from "../index.js";
import "./themes/mono.css";

const THEMES = ["dusty", "mono"] as const;
const SCHEMES = ["light", "dark"] as const;
const SURFACES = [
  "surface",
  "surface-raised",
  "surface-sunken",
  "surface-hover",
  "surface-selected",
] as const;
const TEXT = [
  "text",
  "text-muted",
  "status-danger",
  "syntax-string",
  "syntax-number",
  "syntax-boolean",
  "syntax-function",
] as const;
const BOUNDARIES = ["border-strong", "focus-ring", "action"] as const;
const ACTION_FILLS = ["action", "action-hover", "action-active"] as const;

function rulesOf(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) {
      return [rule, ...rulesOf(rule.cssRules)];
    }
    return rule instanceof CSSGroupingRule ? rulesOf(rule.cssRules) : [];
  });
}

function namesOf(theme: string): string[] {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => rulesOf(sheet.cssRules))
    .filter((rule) => rule.selectorText.includes(`[data-theme="${theme}"]`))
    .flatMap((rule) => Array.from(rule.style))
    .filter((name) => name.startsWith("--dusty-"))
    .sort();
}

function colourOf(theme: string, scheme: string, token: string): number[] {
  const probe = document.createElement("div");
  probe.dataset.theme = theme;
  probe.dataset.colorScheme = scheme;
  probe.style.color = `var(--dusty-${token})`;
  document.body.append(probe);
  const channels = Array.from(
    getComputedStyle(probe).color.matchAll(/[\d.]+/gu),
    ([channel]) => Number(channel),
  );
  probe.remove();
  return channels.slice(0, 3);
}

function luminance(channels: number[]): number {
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const share = channel / 255;
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: number[], second: number[]): number {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function failures(
  theme: string,
  foregrounds: readonly string[],
  backgrounds: readonly string[],
  minimum: number,
): string[] {
  return SCHEMES.flatMap((scheme) =>
    foregrounds.flatMap((foreground) =>
      backgrounds.flatMap((background) => {
        const ratio = contrast(
          colourOf(theme, scheme, foreground),
          colourOf(theme, scheme, background),
        );
        return ratio >= minimum
          ? []
          : [
              `${scheme}: ${foreground} on ${background} is ${ratio.toFixed(2)}`,
            ];
      }),
    ),
  );
}

describe("theme palettes", () => {
  it("define the same tokens in every theme", () => {
    const [first, ...others] = THEMES.map(namesOf);

    expect(first?.length).toBeGreaterThan(20);
    for (const names of others) {
      expect(names).toEqual(first);
    }
  });

  it("resolve to different colours in light and dark", () => {
    expect(colourOf("dusty", "light", "surface")).not.toEqual(
      colourOf("dusty", "dark", "surface"),
    );
  });

  it.each(THEMES)("keep %s text at 4.5:1 on every surface", (theme) => {
    expect(failures(theme, TEXT, SURFACES, 4.5)).toEqual([]);
  });

  it.each(THEMES)("keep %s text on an action fill at 4.5:1", (theme) => {
    expect(failures(theme, ["on-action"], ACTION_FILLS, 4.5)).toEqual([]);
  });

  it.each(THEMES)(
    "keep %s control boundaries at 3:1 on every surface",
    (theme) => {
      expect(failures(theme, BOUNDARIES, SURFACES, 3)).toEqual([]);
    },
  );

  it.each(THEMES)(
    "keep the %s shadow and backdrop darker than every surface",
    (theme) => {
      expect(namesOf(theme)).toEqual(
        expect.arrayContaining(["--dusty-shadow", "--dusty-backdrop"]),
      );
      for (const scheme of SCHEMES) {
        for (const token of ["shadow", "backdrop"]) {
          for (const surface of SURFACES) {
            expect(
              luminance(colourOf(theme, scheme, token)),
              `${scheme}: ${token} against ${surface}`,
            ).toBeLessThan(luminance(colourOf(theme, scheme, surface)));
          }
        }
      }
    },
  );

  it("casts a dark shadow under a popover and dims the page behind a dialog in dark", async () => {
    const screen = await render(
      <div data-color-scheme="dark">
        <Popover trigger="Options" data-testid="panel">
          Content
        </Popover>
        <ExpandableCard title="Helios" level={2} defaultExpanded>
          Details
        </ExpandableCard>
      </div>,
    );
    const channelsOf = (colour: string) =>
      Array.from(colour.matchAll(/[\d.]+/gu), ([channel]) =>
        Number(channel),
      ).slice(0, 3);
    const surface = luminance(colourOf("dusty", "dark", "surface"));
    const dialog = screen.getByRole("dialog").element();

    expect(
      luminance(
        channelsOf(
          getComputedStyle(screen.getByTestId("panel").element()).boxShadow,
        ),
      ),
    ).toBeLessThan(surface);
    expect(
      luminance(
        channelsOf(getComputedStyle(dialog, "::backdrop").backgroundColor),
      ),
    ).toBeLessThan(surface);
  });
});
