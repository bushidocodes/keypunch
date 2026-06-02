import { connect } from 'react-redux';
import { setHostName, setFtpPort, setFtpUserName, setFtpPassword } from '../actions/configForm.js';
import { setThemeDark, setThemeLight } from '../actions/uiStyle';

function ConfigForm(props) {
  const hostName = props.hostName;
  const ftpPort = props.ftpPort;
  const ftpUserName = props.ftpUserName;
  const ftpPassword = props.ftpPassword;

  const labelColor = props.theme === 'dark' ? 'white' : '#333';
  const inputStyle = props.theme === 'dark'
    ? { background: 'black', color: 'white' }
    : { background: 'white', color: 'black' };

  return (
    <div className="config-form">
      <label className="config-label" style={{ color: labelColor }}>Hostname or IP</label>
      <input
        key="hostName"
        style={inputStyle}
        placeholder="192.168.0.1"
        onChange={(evt) => props.setHostName(evt.target.value)}
        value={hostName}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP Port</label>
      <input
        key="ftpPort"
        style={inputStyle}
        onChange={(evt) => props.setFtpPort(evt.target.value)}
        value={ftpPort}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP User Name</label>
      <input
        key="ftpUserName"
        style={inputStyle}
        placeholder="Gene.Amdahl"
        onChange={(evt) => props.setFtpUserName(evt.target.value)}
        value={ftpUserName}
      />
      <label className="config-label" style={{ color: labelColor }}>FTP Password</label>
      <input
        key="ftpPassword"
        style={inputStyle}
        placeholder="Password"
        type="password"
        value={ftpPassword}
        onChange={(evt) => props.setFtpPassword(evt.target.value)}
      />
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

function mapStateToProps(state) {
  return {
    hostName: state.config.hostName,
    ftpPort: state.config.ftpPort,
    ftpUserName: state.config.ftpUserName,
    ftpPassword: state.config.ftpPassword,
    theme: state.uiStyle.theme,
    color: state.uiStyle.color
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setHostName: (hostName) => dispatch(setHostName(hostName)),
    setFtpPort: (ftpPort) => dispatch(setFtpPort(ftpPort)),
    setFtpUserName: (ftpUserName) => dispatch(setFtpUserName(ftpUserName)),
    setFtpPassword: (ftpPassword) => dispatch(setFtpPassword(ftpPassword)),
    setThemeDark: () => dispatch(setThemeDark()),
    setThemeLight: () => dispatch(setThemeLight())
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ConfigForm);
