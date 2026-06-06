import { useEffect } from 'react';
import { connect } from 'react-redux';
import { setHostName, setFtpPort, setFtpUserName, setFtpPassword, setFtpsEnabled } from '../actions/configForm';
import { setThemeDark, setThemeLight } from '../actions/uiStyle';
import type { RootState } from '../reducers';
import type { AppDispatch } from '../store/configureStore';

function mapStateToProps(state: RootState) {
  return {
    hostName:    state.config.hostName,
    ftpPort:     state.config.ftpPort,
    ftpUserName: state.config.ftpUserName,
    ftpPassword: state.config.ftpPassword,
    ftpsEnabled: state.config.ftpsEnabled,
    theme:       state.uiStyle.theme,
  };
}

function mapDispatchToProps(dispatch: AppDispatch) {
  return {
    setHostName:    (hostName: string)       => dispatch(setHostName(hostName)),
    setFtpPort:     (ftpPort: string)        => dispatch(setFtpPort(ftpPort)),
    setFtpUserName: (ftpUserName: string)    => dispatch(setFtpUserName(ftpUserName)),
    setFtpPassword: (ftpPassword: string)    => dispatch(setFtpPassword(ftpPassword)),
    setFtpsEnabled: (ftpsEnabled: boolean)   => dispatch(setFtpsEnabled(ftpsEnabled)),
    setThemeDark:   ()                       => dispatch(setThemeDark()),
    setThemeLight:  ()                       => dispatch(setThemeLight()),
  };
}

type Props = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

function ConfigForm(props: Props) {
  const labelColor = props.theme === 'dark' ? 'white' : '#333';
  const inputStyle = props.theme === 'dark'
    ? { background: 'black', color: 'white' }
    : { background: 'white', color: 'black' };

  // Keep main-process credential store in sync whenever the username or
  // password changes (including on initial mount so the first FTP call
  // succeeds even if the user never changes the fields after app start).
  useEffect(() => {
    window.keypunch.jes.setCredentials(props.ftpUserName, props.ftpPassword);
  }, [props.ftpUserName, props.ftpPassword]);

  return (
    <div className="config-form">
      <label className="config-label" style={{ color: labelColor }}>Hostname or IP</label>
      <input
        key="hostName"
        style={inputStyle}
        placeholder="192.168.0.1"
        onChange={(evt) => props.setHostName(evt.target.value)}
        value={props.hostName}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP Port</label>
      <input
        key="ftpPort"
        style={inputStyle}
        onChange={(evt) => props.setFtpPort(evt.target.value)}
        value={props.ftpPort}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP User Name</label>
      <input
        key="ftpUserName"
        style={inputStyle}
        placeholder="Gene.Amdahl"
        onChange={(evt) => props.setFtpUserName(evt.target.value)}
        value={props.ftpUserName}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP Password</label>
      <input
        key="ftpPassword"
        style={inputStyle}
        placeholder="Password"
        type="password"
        value={props.ftpPassword}
        onChange={(evt) => props.setFtpPassword(evt.target.value)}
      />
      <label className="config-label" style={{ color: labelColor }}>Use FTPS (TLS)</label>
      <label className="config-radio" style={{ color: labelColor }}>
        <input
          type="checkbox"
          checked={props.ftpsEnabled}
          onChange={(evt) => props.setFtpsEnabled(evt.target.checked)}
        />
        {' '}Encrypt connection with AUTH TLS
        {props.ftpsEnabled && (
          <span style={{ marginLeft: '6px', fontSize: '0.85em', opacity: 0.7 }}>
            (requires TLS-enabled z/OS FTP server)
          </span>
        )}
      </label>
      <label className="config-label" style={{ color: labelColor }}>Theme</label>
      <div className="config-radios">
        <label className="config-radio" style={{ color: labelColor }}>
          <input
            type="radio"
            name="theme"
            onChange={() => props.setThemeDark()}
            checked={props.theme === 'dark'}
          />
          Dark
        </label>
        <span style={{ marginLeft: '5px' }} />
        <label className="config-radio" style={{ color: labelColor }}>
          <input
            type="radio"
            name="theme"
            onChange={() => props.setThemeLight()}
            checked={props.theme === 'light'}
          />
          Light
        </label>
      </div>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(ConfigForm);
