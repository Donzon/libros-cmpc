import { unwrapApiResponse } from './unwrap-response';

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(body: unknown = null) {
    super(401, 'Unauthorized', body);
    this.name = 'UnauthorizedError';
  }
}

export type HttpClientOptions = {
  baseUrl: string;
  getAccessToken: () => string | null;
  clearAccessToken: () => void;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

export type HttpRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export type HttpClient = {
  request: <T>(path: string, init?: HttpRequestInit) => Promise<T>;
  get: <T>(path: string, init?: Omit<HttpRequestInit, 'method' | 'body'>) => Promise<T>;
  post: <T>(path: string, body?: unknown, init?: Omit<HttpRequestInit, 'method' | 'body'>) => Promise<T>;
  patch: <T>(path: string, body?: unknown, init?: Omit<HttpRequestInit, 'method' | 'body'>) => Promise<T>;
  delete: <T>(path: string, init?: Omit<HttpRequestInit, 'method' | 'body'>) => Promise<T>;
};

function resolveBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

function shouldSetJsonContentType(body: unknown, headers: Headers): boolean {
  if (headers.has('Content-Type')) {
    return false;
  }

  if (body === undefined || body === null) {
    return false;
  }

  if (body instanceof FormData || body instanceof Blob) {
    return false;
  }

  return typeof body !== 'string';
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalizedBaseUrl = options.baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init: HttpRequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = options.getAccessToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (shouldSetJsonContentType(init.body, headers)) {
      headers.set('Content-Type', 'application/json');
    }

    const { body: rawBody, ...rest } = init;
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      ...rest,
      headers,
      body: resolveBody(rawBody),
    });

    if (response.status === 401) {
      options.clearAccessToken();
      options.onUnauthorized?.();
      const body = await parseErrorBody(response);
      throw new UnauthorizedError(body);
    }

    if (!response.ok) {
      const body = await parseErrorBody(response);
      const message =
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        (typeof body.message === 'string' || Array.isArray(body.message))
          ? Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message
          : `Request failed with status ${response.status}`;
      throw new HttpError(response.status, message, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      return unwrapApiResponse<T>(await response.json());
    }

    return (await response.text()) as T;
  }

  return {
    request,
    get: <T>(path: string, init?: Omit<HttpRequestInit, 'method' | 'body'>) =>
      request<T>(path, { ...init, method: 'GET' }),
    post: <T>(path: string, body?: unknown, init?: Omit<HttpRequestInit, 'method' | 'body'>) =>
      request<T>(path, { ...init, method: 'POST', body }),
    patch: <T>(path: string, body?: unknown, init?: Omit<HttpRequestInit, 'method' | 'body'>) =>
      request<T>(path, { ...init, method: 'PATCH', body }),
    delete: <T>(path: string, init?: Omit<HttpRequestInit, 'method' | 'body'>) =>
      request<T>(path, { ...init, method: 'DELETE' }),
  };
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
}
