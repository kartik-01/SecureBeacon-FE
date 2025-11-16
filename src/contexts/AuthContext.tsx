import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface LoginOptions {
  authorizationParams?: {
    redirect_uri?: string;
    screen_hint?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  loginWithRedirect: (options?: LoginOptions) => Promise<void>;
  loginWithPopup: (options?: LoginOptions) => Promise<void>;
  logout: () => void;
  getAccessTokenSilently: (options?: { authorizationParams?: { audience?: string } }) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth0 = useAuth0();

  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    loginWithPopup,
    logout: auth0Logout,
    getAccessTokenSilently: auth0GetAccessTokenSilently,
  } = auth0;

  // Wrapper to always include audience when getting access token
  const getAccessTokenSilently = async (options?: { authorizationParams?: { audience?: string } }) => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    return auth0GetAccessTokenSilently({
      ...options,
      authorizationParams: {
        audience: audience,
        ...options?.authorizationParams,
      },
    });
  };

  const logout = () => {
    // Clear stored token on logout, then redirect via Auth0
    try {
      sessionStorage.removeItem('phishsafe_token');
    } catch (e) {
      // ignore
    }

    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  // Store token in sessionStorage when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      getAccessTokenSilently()
        .then((token) => {
          try {
            sessionStorage.setItem('phishsafe_token', token);
          } catch (e) {
            // Ignore storage errors
          }
        })
        .catch(() => {
          // Ignore token retrieval errors
        });
    }
  }, [isAuthenticated, user, getAccessTokenSilently]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        loginWithRedirect,
        loginWithPopup,
        logout,
        getAccessTokenSilently,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
