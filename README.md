# DustyUI

A calm, beach-inspired React UI component library using CSS Modules.

## Install

```bash
npm install dustyui
```

Requires React 19 and a bundler that handles CSS Modules.

## Usage

```tsx
import { Avatar, Badge, Button, IconButton } from "dustyui";

export function Example() {
  return (
    <>
      <Avatar name="Wioletta Gluza" />
      <Badge label="New" />
      <Button variant="secondary">Save</Button>
      <IconButton label="Close" icon={<CloseIcon />} />
    </>
  );
}
```

## Accessibility

The props are shaped so the accessible version is the only one that compiles.

- `Avatar` requires `name`. It becomes the accessible name and the source of the initials. Pass `decorative` when the name is already written next to the avatar, and give an `image` an empty `alt`.
- `IconButton` requires `label`, so an icon-only button always has a name.
- `Button` with `loading` keeps keyboard focus, ignores activation, shows a spinner and announces `loadingLabel` ("Loading" by default). Pass `aria-disabled` to make a button unavailable while keeping it focusable.
- `announce(message, politeness)` sends a message to screen readers through one shared live region. Use it for status changes such as counts and results.

```tsx
import { announce } from "dustyui";

announce("3 unread messages");
announce("Connection lost", "assertive");
```

## Theming

Components use semantic tokens only, so a theme is one CSS file that sets them.

- `dusty` is the default and loads with the components.
- `mono` is a neutral grey theme: import `dustyui/themes/mono.css` and set `data-theme="mono"` on `<html>`.
- Light and dark follow the system. Force one with `data-color-scheme="light"` or `data-color-scheme="dark"` on the same element.

To write your own theme, copy `src/styles/themes/mono.css`, rename the selector to `[data-theme="yours"]` and change the values. Every colour takes a light and a dark value through `light-dark()`.

## Scripts

| Script              | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `npm run build`     | Compiles to `dist` and copies the stylesheets               |
| `npm run typecheck` | Type-checks with TypeScript 7                               |
| `npm test`          | Unit tests in Node and component tests in headless Chromium |
| `npm run lint`      | ESLint, with accessibility rules as errors                  |
| `npm run lint:css`  | Stylelint                                                   |
| `npm run format`    | Prettier                                                    |
