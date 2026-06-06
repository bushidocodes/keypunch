import {
  SET_RESULTS_CONTENT,
  SET_JOB_STATUS,
  SET_CURRENT_STEP,
  SET_IS_CONNECTED,
  SET_IS_CONNECTING,
  SET_IS_SUBMITTED,
  SET_IS_SUBMITTING,
  SET_IS_RETRIEVED,
  SET_IS_RETRIEVING,
  SET_IS_DISCONNECTED,
  SET_IS_DISCONNECTING,
  SET_ERROR_MESSAGE,
} from '../constants';

export const setResultsContent  = (resultsContent: string)   => ({ type: SET_RESULTS_CONTENT,  resultsContent });
export const setJobStatus       = (jobStatus: string)         => ({ type: SET_JOB_STATUS,       jobStatus });
export const setCurrentStep     = (currentStep: string)       => ({ type: SET_CURRENT_STEP,     currentStep });
export const setIsConnected     = (isConnected: boolean)      => ({ type: SET_IS_CONNECTED,     isConnected });
export const setIsConnecting    = (isConnecting: boolean)     => ({ type: SET_IS_CONNECTING,    isConnecting });
export const setIsSubmitted     = (isSubmitted: boolean)      => ({ type: SET_IS_SUBMITTED,     isSubmitted });
export const setIsSubmitting    = (isSubmitting: boolean)     => ({ type: SET_IS_SUBMITTING,    isSubmitting });
export const setIsRetrieved     = (isRetrieved: boolean)      => ({ type: SET_IS_RETRIEVED,     isRetrieved });
export const setIsRetrieving    = (isRetrieving: boolean)     => ({ type: SET_IS_RETRIEVING,    isRetrieving });
export const setIsDisconnected  = (isDisconnected: boolean)   => ({ type: SET_IS_DISCONNECTED,  isDisconnected });
export const setIsDisconnecting = (isDisconnecting: boolean)  => ({ type: SET_IS_DISCONNECTING, isDisconnecting });
export const setErrorMessage    = (errorMessage: string)      => ({ type: SET_ERROR_MESSAGE,    errorMessage });

export type ResultsAction =
  | ReturnType<typeof setResultsContent>
  | ReturnType<typeof setJobStatus>
  | ReturnType<typeof setCurrentStep>
  | ReturnType<typeof setIsConnected>
  | ReturnType<typeof setIsConnecting>
  | ReturnType<typeof setIsSubmitted>
  | ReturnType<typeof setIsSubmitting>
  | ReturnType<typeof setIsRetrieved>
  | ReturnType<typeof setIsRetrieving>
  | ReturnType<typeof setIsDisconnected>
  | ReturnType<typeof setIsDisconnecting>
  | ReturnType<typeof setErrorMessage>;
