import React, { createContext, useContext, useEffect, useState } from 'react';

interface ConnectivityContextType {
  isOnline: boolean;
}

const ConnectivityContext = createContext<ConnectivityContextType>({ isOnline: true });

export const useConnectivity = () => useContext(ConnectivityContext);

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      injectCDN();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const injectCDN = () => {
    const assets: {id: string, href: string}[] = [
      // Removed CDN Bootstrap and legacy fonts
    ];

    assets.forEach(asset => {
      if (!document.getElementById(asset.id)) {
        const link = document.createElement('link');
        link.id = asset.id;
        link.rel = 'stylesheet';
        link.href = asset.href;
        document.head.appendChild(link);
      }
    });
  };

  return (
    <ConnectivityContext.Provider value={{ isOnline }}>
      {children}
    </ConnectivityContext.Provider>
  );
};
