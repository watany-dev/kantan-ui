import fc from "fast-check";

/**
 * PBT global configuration.
 * CI: 30 runs (fast), Local: 100 runs (default)
 */
fc.configureGlobal({
	numRuns: process.env.CI ? 30 : 100,
});
