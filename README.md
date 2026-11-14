# DustyUI

A small React component library, styled with CSS Modules and themed through CSS custom properties. Accessible by default, with light and dark themes built in.

## Install

```bash
npm install dustyui
```

Requires React 19.2 or later and a bundler that handles CSS Modules, such as Next.js or Vite.

## Usage

```tsx
import { Button } from "dustyui";

export function Example() {
  return <Button>Save</Button>;
}
```

The styles load with the components, so there is no stylesheet to import.

The library is light by default and never changes the colour scheme of your page on its own. Set `data-color-scheme` on the root element, or on any part of the page, to choose:

| Value    | Result                     |
| -------- | -------------------------- |
| `light`  | Light, the default         |
| `dark`   | Dark                       |
| `system` | Follows the system setting |

Components take their text colour from the theme and paint no background of their own, so give the page the matching one:

```css
body {
  background-color: var(--dusty-surface);
  color: var(--dusty-text);
}
```

## Accessibility

- A component that needs an accessible name takes it as a required prop, so it cannot be left out by accident.
- Decorative parts, such as icons, are hidden from screen readers.
- Loading controls and controls marked `aria-disabled` stay focusable, so keyboard users do not lose their place. Native `disabled` controls do not.
- Status changes are announced through one shared live region, which you can also use directly:

```tsx
import { announce } from "dustyui";

announce("3 unread messages");
announce("Connection lost", "assertive");
```

## Scripts

| Script                  | What it does                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run build`         | Compiles to `dist` and copies the stylesheets                                                              |
| `npm run typecheck`     | Type-checks the source and the tests with TypeScript 7                                                     |
| `npm test`              | Unit tests in Node and component tests in headless Chromium                                                |
| `npm run test:consumer` | Installs the packed library in a fresh Next.js app and checks it under a policy that forbids inline styles |
| `npm run lint`          | ESLint, with accessibility rules as errors                                                                 |
| `npm run lint:css`      | Stylelint                                                                                                  |
| `npm run format`        | Prettier                                                                                                   |

Run `npx playwright install chromium` once before the first `npm test`.

## Licence

MIT
