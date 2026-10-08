export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  statusCode: number;
  timestamp: string;
  path: string;
  meta?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isApiSuccessEnvelope(
  value: unknown,
): value is ApiSuccessEnvelope<unknown> {
  return (
    isRecord(value) &&
    value.success === true &&
    'data' in value &&
    typeof value.statusCode === 'number' &&
    typeof value.timestamp === 'string' &&
    typeof value.path === 'string'
  );
}

/**
 * El backend envuelve JSON de éxito en `{ success, data, statusCode, timestamp, path }`.
 * El listado además trae `meta` al mismo nivel. Un body sin envelope se devuelve tal cual
 * (tests y respuestas que el interceptor omite: CSV, 204).
 */
export function unwrapApiResponse<T>(body: unknown): T {
  if (!isApiSuccessEnvelope(body)) {
    return body as T;
  }

  if (body.meta !== undefined) {
    return { data: body.data, meta: body.meta } as T;
  }

  return body.data as T;
}
