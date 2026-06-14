// With "type": "module" in package.json, rollup uses isNodeMode=1 for __toESM(),
// which ignores __esModule: true on CJS packages. For react-ace (which uses
// exports.__esModule = true; exports.default = AceEditor), this causes the default
// import to resolve to the whole module.exports object instead of the component.
// Detect and unwrap explicitly.
import _AceEditor from 'react-ace';

type AceModule = { __esModule: true; default: typeof _AceEditor };
const mod: unknown = _AceEditor;
const isWrapped = (m: unknown): m is AceModule =>
  typeof m === 'object' && m !== null && '__esModule' in m;

const AceEditor: typeof _AceEditor = isWrapped(mod) ? mod.default : (mod as typeof _AceEditor);
export default AceEditor;
