import { HttpError, getApiBaseUrl } from '../../../shared/api/http-client';
import { unwrapApiResponse } from '../../../shared/api/unwrap-response';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresIn: string;
};

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        (typeof body.message === 'string' || Array.isArray(body.message))
      ) {
        return Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    }
  } catch {
    // ignore parse errors
  }

  if (response.status === 401) {
    return 'Credenciales inválidas';
  }

  return `Request failed with status ${response.status}`;
}

/**
 * Login usa fetch directo (no el http client con interceptor 401)
 * para que credenciales inválidas no disparen "sesión expirada".
 */
export async function loginRequest(
  credentials: LoginCredentials,
  options?: { baseUrl?: string; fetchImpl?: typeof fetch },
): Promise<LoginResponse> {
  const baseUrl = (options?.baseUrl ?? getApiBaseUrl()).replace(/\/$/, '');
  const fetchImpl = options?.fetchImpl ?? fetch;

  const response = await fetchImpl(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new HttpError(response.status, message);
  }

  const body: unknown = await response.json();
  return unwrapApiResponse<LoginResponse>(body);
}
