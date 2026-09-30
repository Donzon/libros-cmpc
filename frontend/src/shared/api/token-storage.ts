const ACCESS_TOKEN_KEY = 'cmpc.accessToken';

export type TokenStorage = {
  getAccessToken: () => string | null;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
};

export function createTokenStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
): TokenStorage {
  return {
    getAccessToken: () => storage.getItem(ACCESS_TOKEN_KEY),
    setAccessToken: (token: string) => {
      storage.setItem(ACCESS_TOKEN_KEY, token);
    },
    clearAccessToken: () => {
      storage.removeItem(ACCESS_TOKEN_KEY);
    },
  };
}

export const tokenStorage = createTokenStorage();
