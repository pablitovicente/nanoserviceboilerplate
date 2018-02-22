module.exports = {
  "extends": "airbnb-base",
  "plugins": [
    "import"
  ],
  "globals": {
    "Promise": true
  },
  "rules": {
    "strict": "off",
    "comma-dangle": ["error", "never"],
    "object-shorthand": ["error", "consistent"],
    "no-console": ["error"],
    "no-param-reassign": ["warn"],
    "max-len": ["error", 150],
    "space-unary-ops": [
      1, {
        "words": true,
        "nonwords": false,
        "overrides": {
          "new": false,
          "++": true
        }
      }
    ]
  }
};
