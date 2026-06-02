import {
  SET_HOST_NAME,
  SET_FTP_PORT,
  SET_FTP_USER_NAME,
  SET_FTP_PASSWORD,
} from '../constants';
import type { ConfigFormAction } from '../actions/configForm';

export interface ConfigState {
  hostName: string;
  ftpPort: string;
  ftpUserName: string;
  ftpPassword: string;
}

const initialConfigState: ConfigState = {
  hostName: '',
  ftpPort: '21',
  ftpUserName: '',
  ftpPassword: '',
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
    default:
      return state;
  }
  return newState;
}
