// Pick the dev vs prod store at build time. Vite statically replaces
// `import.meta.env.DEV`, so the unused branch is tree-shaken out of the bundle.
import configureStoreDev from './configureStore.development';
import configureStoreProd from './configureStore.production';

const configureStore = import.meta.env.DEV ? configureStoreDev : configureStoreProd;

export default configureStore;
