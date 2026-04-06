import { createContext, useContext } from 'react';

const ReaderContext = createContext(null);

export function ReaderProvider({ value, children }) {
  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  return useContext(ReaderContext);
}
