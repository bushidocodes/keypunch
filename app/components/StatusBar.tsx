import { connect } from 'react-redux';
import Indicator from './Indicator';
import { store } from '../index';
import { testConnectivity } from '../utils/nativeDialogs';
import jes from '../utils/jesFtp';
import type { RootState } from '../reducers';

function mapStateToProps(state: RootState) {
  return {
    currentStep:    state.results.currentStep,
    isConnected:    state.results.isConnected,
    isConnecting:   state.results.isConnecting,
    isSubmitted:    state.results.isSubmitted,
    isSubmitting:   state.results.isSubmitting,
    isRetrieved:    state.results.isRetrieved,
    isRetrieving:   state.results.isRetrieving,
    isDisconnected: state.results.isDisconnected,
    isDisconnecting: state.results.isDisconnecting,
    errorMessage:   state.results.errorMessage,
  };
}

function mapDispatchToProps() {
  return {
    testConnectivity: (evt: React.MouseEvent) => {
      evt.preventDefault();
      testConnectivity();
    },
    jesConnect: (evt: React.MouseEvent) => {
      evt.preventDefault();
      jes.connect();
    },
    disconnect: (evt: React.MouseEvent) => {
      evt.preventDefault();
      jes.disconnect();
    },
    submitJob: async (evt: React.MouseEvent) => {
      evt.preventDefault();
      const confirmed = await window.keypunch.confirmSubmit();
      if (confirmed) {
        jes.submitJob(store.getState().editor.editorContent);
      }
    },
  };
}

type Props = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

function StatusBar(props: Props) {
  return (
    <div className="status-bar">
      <button className="btn-test" onClick={props.testConnectivity}>
        TEST
      </button>

      {!props.isConnected ? (
        <button className="btn-connect" onClick={props.jesConnect}>
          CONNECT
        </button>
      ) : (
        <button className="btn-interrupt" onClick={props.disconnect}>
          INTERRUPT
        </button>
      )}

      {(['CONN', 'SENT', 'RETR', 'DISC'] as const).map((label, i) => {
        const [isLit, isBlinking] = [
          [props.isConnected,    props.isConnecting],
          [props.isSubmitted,    props.isSubmitting],
          [props.isRetrieved,    props.isRetrieving],
          [props.isDisconnected, props.isDisconnecting],
        ][i];
        return (
          <div key={label} className="indicator-cell">
            {label}
            <br />
            <div className="indicator-light">
              <Indicator isLit={isLit} isBlinking={isBlinking} />
            </div>
          </div>
        );
      })}

      <button className="btn-load" onClick={props.submitJob}>
        LOAD
      </button>

      {props.errorMessage && (
        <span className="status-bar-error">{props.errorMessage}</span>
      )}
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(StatusBar);
