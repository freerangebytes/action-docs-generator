const Configuration = {
    /*
     * Resolve and load @commitlint/config-conventional from node_modules.
     * Referenced packages must be installed
     */
    extends: ["@commitlint/config-conventional"],
    /*
     * Resolve and load conventional-changelog-atom from node_modules.
     * Referenced packages must be installed
     */
    parserPreset: "conventional-changelog-atom",
    /*
     * Resolve and load @commitlint/format from node_modules.
     * Referenced package must be installed
     */
    formatter: "@commitlint/format",
    /*
     * Whether commitlint uses the default ignore rules, see the description above.
     */
    defaultIgnores: true,
    /*
     * Custom URL to show upon failure
     */
    helpUrl:
      "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",
    /*
     * Rules to override the default configuration.
     * Standardize line length to 120 characters (matching yamllint).
     */
    rules: {
      "body-max-line-length": [2, "always", 120],
      "header-max-length": [2, "always", 120],
    },
  };

  export default Configuration;
