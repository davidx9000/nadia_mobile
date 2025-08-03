import React, { createContext, useContext } from 'react';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';

const SolanaWalletContext = createContext<ReturnType<typeof useSolanaWallet> | null>(null);

export const SolanaWalletProvider = ({ children }) => {
  const wallet = useSolanaWallet();
  return (
    <SolanaWalletContext.Provider value={wallet}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

export const useSolanaWalletContext = () => {
  const ctx = useContext(SolanaWalletContext);
  if (!ctx) throw new Error("useSolanaWalletContext must be used inside SolanaWalletProvider");
  return ctx;
};
