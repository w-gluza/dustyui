const PRESSED = /:active(?![-\w])/u;
const PRESSED_EVERYWHERE = /:active(?![-\w])/gu;

function collect(rules: CSSRuleList, found: CSSStyleRule[]): void {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      if (PRESSED.test(rule.selectorText)) {
        found.push(rule);
      }
      collect(rule.cssRules, found);
    } else if (rule instanceof CSSGroupingRule) {
      collect(rule.cssRules, found);
    }
  }
}

function matchesWhenPressed(element: Element, selector: string): boolean {
  if (selector.includes(":not(:active)")) {
    return false;
  }
  return element.matches(selector.replaceAll(PRESSED_EVERYWHERE, ""));
}

export function pressedStyle(element: Element, property: string): string {
  const pressed: CSSStyleRule[] = [];
  for (const sheet of document.styleSheets) {
    collect(sheet.cssRules, pressed);
  }
  return pressed
    .filter((rule) => matchesWhenPressed(element, rule.selectorText))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean)
    .join(" then ");
}
