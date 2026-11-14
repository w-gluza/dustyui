# DustyUI

A calm, beach-inspired React UI component library using CSS Modules.

## Install

```bash
npm install dustyui
```

Requires React 19 and a bundler that handles CSS Modules.

## Usage

```tsx
import { Avatar, Badge, Button } from "dustyui";

export function Example() {
  return (
    <>
      <Avatar role="img" aria-label="Wioletta Gluza" fallback="WG" />
      <Badge label="New" />
      <Button variant="secondary">Save</Button>
    </>
  );
}
```

## Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run build`     | Compiles to `dist` and copies the stylesheets |
| `npm run typecheck` | Type-checks with TypeScript 7                 |
| `npm run lint`      | ESLint, with accessibility rules as errors    |
| `npm run lint:css`  | Stylelint                                     |
| `npm run format`    | Prettier                                      |
