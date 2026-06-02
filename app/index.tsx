import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import configureStore from './store/configureStore';
import { openFilePicker, newFile, saveFile } from './utils/nativeDialogs';
import jes from './utils/jesFtp';
import './app.global.css';

// Hack: Exporting Store to have access in nativeDialogs / jesFtp.
export const store = configureStore();

// The native application menu is built in the MAIN process. Menu clicks for
// editor actions arrive over IPC on the 'menu' channel; wire them to the same
// handlers the menu used to call directly.
if (window.keypunch?.onMenu) {
  window.keypunch.onMenu((channel) => {
    switch (channel) {
      case 'file:new':    newFile();          break;
      case 'file:open':   openFilePicker();   break;
      case 'file:save':   saveFile(true);     break;
      case 'file:saveAs': saveFile(false);    break;
      case 'kill-ftp':    jes.disconnect();   break;
      default: break;
    }
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
const root = createRoot(rootEl);
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
