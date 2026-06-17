// No-op stub for `ace-builds` and all its sub-paths
// (e.g. ace-builds/src-noconflict/mode-java).
// These modules are imported purely for their side-effects (registering
// modes/themes with the global ace object).  Since AceEditor itself is mocked
// via react-ace.tsx above, these side-effects are irrelevant in tests.
export default {};
export const config = {};
