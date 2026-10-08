import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  statusCode: number;
  timestamp: string;
  path: string;
  meta?: unknown;
};

type PaginatedPayload = {
  data: unknown;
  meta: unknown;
};

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload: unknown) => {
        if (skip || this.shouldSkip(payload, request, response)) {
          return payload;
        }
        return this.wrap(payload, request, response);
      }),
    );
  }

  private shouldSkip(
    payload: unknown,
    request: Request,
    response: Response,
  ): boolean {
    if (payload === undefined || payload === null) {
      return true;
    }
    if (typeof payload === 'string') {
      return true;
    }
    if (Buffer.isBuffer(payload)) {
      return true;
    }
    if (payload instanceof StreamableFile) {
      return true;
    }
    if (this.isSuccessEnvelope(payload)) {
      return true;
    }

    const path = request.path ?? request.url ?? '';
    if (path.includes('/docs')) {
      return true;
    }

    const contentType = String(response.get('Content-Type') ?? '');
    return (
      contentType.includes('text/csv') ||
      contentType.includes('text/html') ||
      contentType.includes('application/octet-stream')
    );
  }

  private wrap(
    payload: unknown,
    request: Request,
    response: Response,
  ): SuccessEnvelope<unknown> {
    const envelope: SuccessEnvelope<unknown> = {
      success: true,
      data: payload,
      statusCode: response.statusCode,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    if (this.isPaginated(payload)) {
      envelope.data = payload.data;
      envelope.meta = payload.meta;
    }

    return envelope;
  }

  private isPaginated(payload: unknown): payload is PaginatedPayload {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return false;
    }
    return (
      Object.prototype.hasOwnProperty.call(payload, 'data') &&
      Object.prototype.hasOwnProperty.call(payload, 'meta')
    );
  }

  private isSuccessEnvelope(payload: unknown): payload is SuccessEnvelope<unknown> {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    return (
      'success' in payload &&
      payload.success === true &&
      'data' in payload &&
      'statusCode' in payload &&
      'timestamp' in payload &&
      'path' in payload
    );
  }
}
