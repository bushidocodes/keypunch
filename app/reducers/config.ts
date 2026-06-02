import {
  SET_HOST_NAME,
  SET_FTP_PORT,
  SET_FTP_USER_NAME,
  SET_FTP_PASSWORD,
  SET_FTPS_ENABLED,
} from '../constants';
import type { ConfigFormAction } from '../actions/configForm';

export interface ConfigState {
  hostName: string;
  ftpPort: string;
  ftpUserName: string;
  /** Held in Redux for the controlled password input only.
   *  NOT included in FtpConfig IPC payloads — the actual credential used
   *  for FTP connections is stored in the main process via jes:setCredentials.
   */
  ftpPassword: string;
  /** When true, the FTP connection uses explicit FTPS (AUTH TLS). */
  ftpsEnabled: boolean;
}

const initialConfigState: ConfigState = {
  hostName: '',
  ftpPort: '21',
  ftpUserName: '',
  ftpPassword: '',
  ftpsEnabled: false,
};

export default function config(
  state: ConfigState = initialConfigState,
  action: ConfigFormAction
): ConfigState {
  const newState = { ...state };

  switch (action.type) {
    case SET_HOST_NAME:
      newState.hostName = action.hostName;
      break;
    case SET_FTP_PORT:
      newState.ftpPort = action.ftpPort;
      break;
    case SET_FTP_USER_NAME:
      newState.ftpUserName = action.ftpUserName;
      break;
    case SET_FTP_PASSWORD:
      newState.ftpPassword = action.ftpPassword;
      break;
    case SET_FTPS_ENABLED:
      newState.ftpsEnabled = action.ftpsEnabled;
      break;
    default:
      return state;
  }
  return newState;
}
