const PHYSICAL_PROPERTIES = [
  "/^(margin|padding)-(top|right|bottom|left)$/",
  "/^border-(top|right|bottom|left)(-.+)?$/",
  "/^(min-|max-)?(width|height)$/",
  "top",
  "right",
  "bottom",
  "left",
];
const COLOUR_FUNCTIONS = [
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
  "light-dark",
];

export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]*$",
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global", "local"] },
    ],
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
    "property-disallowed-list": PHYSICAL_PROPERTIES,
    "declaration-property-value-disallowed-list": {
      outline: ["none", "0"],
      "outline-style": ["none"],
      "outline-width": ["0"],
    },
    "declaration-property-unit-disallowed-list": { "font-size": ["px"] },
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": COLOUR_FUNCTIONS,
  },
  overrides: [
    {
      files: ["src/styles/themes/*.css"],
      rules: { "color-no-hex": null, "function-disallowed-list": null },
    },
  ],
};
