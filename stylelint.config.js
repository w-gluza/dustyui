export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]*$",
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global", "local"] },
    ],
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
    "declaration-property-value-disallowed-list": { outline: ["none", "0"] },
    "color-no-hex": true,
  },
  overrides: [
    {
      files: ["src/styles/**/*.css"],
      rules: { "color-no-hex": null },
    },
  ],
};
