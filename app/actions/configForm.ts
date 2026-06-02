import {
  SET_HOST_NAME,
  SET_FTP_PORT,
  SET_FTP_USER_NAME,
  SET_FTP_PASSWORD,
} from '../constants';

export const setHostName = (hostName: string) => ({
  type: SET_HOST_NAME,
  hostName,
});

export const setFtpPort = (ftpPort: string) => ({
  type: SET_FTP_PORT,
  ftpPort,
});

export const setFtpUserName = (ftpUserName: string) => ({
  type: SET_FTP_USER_NAME,
  ftpUserName,
});

export const setFtpPassword = (ftpPassword: string) => ({
  type: SET_FTP_PASSWORD,
  ftpPassword,
});

export type ConfigFormAction =
  | ReturnType<typeof setHostName>
  | ReturnType<typeof setFtpPort>
  | ReturnType<typeof setFtpUserName>
  | ReturnType<typeof setFtpPassword>;
