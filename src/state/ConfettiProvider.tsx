import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfettiAnimation } from '../components/ConfettiAnimation';

type ConfettiContextValue = {
  showConfetti: () => void;
};

const ConfettiContext = createContext<ConfettiContextValue | undefined>(undefined);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);

  const showConfetti = useCallback(() => {
    setVisible(true);
    // Auto-hide after animation completes
    setTimeout(() => {
      setVisible(false);
    }, 3000);
  }, []);

  const value = {
    showConfetti,
  };

  return (
    <ConfettiContext.Provider value={value}>
      {children}
      <ConfettiAnimation
        visible={visible}
        onComplete={() => {
          setVisible(false);
        }}
      />
    </ConfettiContext.Provider>
  );
};

export const useConfetti = (): ConfettiContextValue => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within ConfettiProvider');
  }
  return context;
};

