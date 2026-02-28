export function uiReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading:        action.payload.loading,
        loadingMessage: action.payload.message || '',
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, loadingMessage: '' };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };

    default:
      return undefined;
  }
}
