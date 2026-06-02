import { connect } from 'react-redux';
import Indicator from './Indicator';
import { store } from '../index';
import { testIndicators } from '../utils/nativeDialogs';
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
  };
}

function mapDispatchToProps() {
  return {
    testIndicators: (evt: React.MouseEvent) => {
      evt.preventDefault();
      testIndicators();
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
    <div
      className="status-bar"
      style={{
        bottom: '0',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        zIndex: '10',
        background: '#aaa',
        width: '100%',
        height: '50px',
        overflow: 'hidden',
      }}
    >
      <button
        style={{ backgroundColor: 'orange', border: 'none', color: 'white', margin: '4px', width: '90px' }}
        onClick={props.testIndicators}
      >
        TEST
      </button>

      {!props.isConnected ? (
        <button
          style={{ backgroundColor: 'green', border: 'none', color: 'white', margin: '4px', width: '90px' }}
          onClick={props.jesConnect}
        >
          CONNECT
        </button>
      ) : (
        <button
          style={{ backgroundColor: '#C0101D', border: 'none', color: 'white', margin: '4px', width: '90px' }}
          onClick={props.disconnect}
        >
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
          <div
            key={label}
            style={{ fontSize: '10px', marginTop: '8px', marginLeft: '10px', color: 'black', width: '30px' }}
          >
            {label}
            <br />
            <div style={{ marginLeft: '9px', marginTop: '3px' }}>
              <Indicator isLit={isLit} isBlinking={isBlinking} />
            </div>
          </div>
        );
      })}

      <button
        style={{
          backgroundColor: '#195DAE',
          border: 'none',
          color: 'white',
          margin: '4px',
          marginLeft: '10px',
          width: '90px',
        }}
        onClick={props.submitJob}
      >
        LOAD
      </button>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(StatusBar);
