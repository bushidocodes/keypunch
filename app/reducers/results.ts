import type { ResultsAction } from '../actions/results';
import {
  SET_CURRENT_STEP,
  SET_ERROR_MESSAGE,
  SET_IS_CONNECTED,
  SET_IS_CONNECTING,
  SET_IS_DISCONNECTED,
  SET_IS_DISCONNECTING,
  SET_IS_RETRIEVED,
  SET_IS_RETRIEVING,
  SET_IS_SUBMITTED,
  SET_IS_SUBMITTING,
  SET_JOB_STATUS,
  SET_RESULTS_CONTENT,
} from '../constants';

export interface ResultsState {
  resultsContent: string;
  jobStatus: string;
  /** One of: connect | submit | retrieve | disconnect — or empty. */
  currentStep: string;
  isConnected: boolean;
  isConnecting: boolean;
  isSubmitted: boolean;
  isSubmitting: boolean;
  isRetrieved: boolean;
  isRetrieving: boolean;
  isDisconnected: boolean;
  isDisconnecting: boolean;
  /** Non-empty when a JES/FTP operation failed; displayed in the status bar. */
  errorMessage: string;
}

const initialResultsState: ResultsState = {
  resultsContent: 'Not yet submitted to mainframe',
  jobStatus: '',
  currentStep: '',
  isConnected: false,
  isConnecting: false,
  isSubmitted: false,
  isSubmitting: false,
  isRetrieved: false,
  isRetrieving: false,
  isDisconnected: false,
  isDisconnecting: false,
  errorMessage: '',
};

export default function results(
  state: ResultsState = initialResultsState,
  action: ResultsAction
): ResultsState {
  const newState = { ...state };

  switch (action.type) {
    case SET_RESULTS_CONTENT:
      newState.resultsContent = action.resultsContent;
      break;
    case SET_JOB_STATUS:
      newState.jobStatus = action.jobStatus;
      break;
    case SET_CURRENT_STEP:
      newState.currentStep = action.currentStep;
      break;
    case SET_IS_CONNECTED:
      newState.isConnected = action.isConnected;
      break;
    case SET_IS_CONNECTING:
      newState.isConnecting = action.isConnecting;
      break;
    case SET_IS_SUBMITTED:
      newState.isSubmitted = action.isSubmitted;
      break;
    case SET_IS_SUBMITTING:
      newState.isSubmitting = action.isSubmitting;
      break;
    case SET_IS_RETRIEVED:
      newState.isRetrieved = action.isRetrieved;
      break;
    case SET_IS_RETRIEVING:
      newState.isRetrieving = action.isRetrieving;
      break;
    case SET_IS_DISCONNECTED:
      newState.isDisconnected = action.isDisconnected;
      break;
    case SET_IS_DISCONNECTING:
      newState.isDisconnecting = action.isDisconnecting;
      break;
    case SET_ERROR_MESSAGE:
      newState.errorMessage = action.errorMessage;
      break;
    default:
      return state;
  }
  return newState;
}
