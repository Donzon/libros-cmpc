import { createHttpClient, getApiBaseUrl } from './http-client';
import { tokenStorage } from './token-storage';

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

export const http = createHttpClient({
  baseUrl: getApiBaseUrl(),
  getAccessToken: () => tokenStorage.getAccessToken(),
  clearAccessToken: () => tokenStorage.clearAccessToken(),
  onUnauthorized: () => {
    unauthorizedHandler?.();
  },
});
