import { createHashRouter } from 'react-router-dom';
import App from './components/App';
import ConfigForm from './components/ConfigForm';
import Editor from './components/Editor';
import Explorer from './components/Explorer';
import Results from './components/Results';

// HashRouter (createHashRouter) is required because the packaged app loads via
// file://, where browser-history routing does not work. `App` is the layout
// component: it renders the sidebar nav + status bar around an <Outlet/>.
//
// The old react-router v3 `onEnter={pollJobStatus|listDatasets}` hooks now live
// as `useEffect(..., [])` inside the Results / Explorer route components.
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Editor /> },
      { path: 'editor', element: <Editor /> },
      { path: 'config', element: <ConfigForm /> },
      { path: 'results', element: <Results /> },
      { path: 'explorer', element: <Explorer /> },
    ],
  },
]);

export default router;
