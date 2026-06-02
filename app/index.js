import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, hashHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import routes from './routes';
import configureStore from './store/configureStore';
import { openFilePicker, newFile, saveFile } from './utils/nativeDialogs';
import jes from './utils/jesFtp';
import './app.global.css';

// Hack: Exporting Store to have access in nativeDialogs / jesFtp.
export const store = configureStore();
const history = syncHistoryWithStore(hashHistory, store);

// The native application menu is built in the MAIN process now. Menu clicks for
// editor actions arrive over IPC on the 'menu' channel; wire them to the same
// handlers the menu used to call directly.
if (window.keypunch && window.keypunch.onMenu) {
  window.keypunch.onMenu((channel) => {
    switch (channel) {
      case 'file:new':
        newFile();
        break;
      case 'file:open':
        openFilePicker();
        break;
      case 'file:save':
        saveFile(true);
        break;
      case 'file:saveAs':
        saveFile(false);
        break;
      case 'kill-ftp':
        jes.disconnect();
        break;
      default:
        break;
    }
  });
}

render(
  <Provider store={store}>
    <Router history={history} routes={routes} />
  </Provider>,
  document.getElementById('root')
);
