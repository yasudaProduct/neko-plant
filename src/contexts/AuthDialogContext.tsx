"use client";

import LoginDialog from "@/components/LoginDialog";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface AuthDialogContextProps {
  showLoginDialog: (message?: string) => void;
  hideLoginDialog: () => void;
  isLoginDialogOpen: boolean;
}

const AuthDialogContext = createContext<AuthDialogContextProps | undefined>(
  undefined
);

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog must be used within an AuthDialogProvider");
  }
  return context;
}

interface AuthDialogProviderProps {
  children: ReactNode;
}

export function AuthDialogProvider({ children }: AuthDialogProviderProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | undefined>(
    undefined
  );

  const showLoginDialog = useCallback((message?: string) => {
    setLoginMessage(message);
    setIsLoginDialogOpen(true);
  }, []);

  const hideLoginDialog = useCallback(() => {
    setIsLoginDialogOpen(false);
  }, []);

  return (
    <AuthDialogContext.Provider
      value={{
        showLoginDialog,
        hideLoginDialog,
        isLoginDialogOpen,
      }}
    >
      {children}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={hideLoginDialog}
        message={loginMessage}
      />
    </AuthDialogContext.Provider>
  );
}
