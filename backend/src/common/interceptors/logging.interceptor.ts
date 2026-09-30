import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticatedUser } from '../../modules/auth/jwt.strategy';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          this.format(request, response.statusCode, Date.now() - startedAt),
        );
      }),
      catchError((error: unknown) => {
        this.logger.warn(
          this.format(request, this.resolveStatus(error), Date.now() - startedAt),
        );
        return throwError(() => error);
      }),
    );
  }

  private format(
    request: RequestWithUser,
    statusCode: number,
    elapsedMs: number,
  ): string {
    const actor = request.user ? ` user=${request.user.userId}` : '';
    return `${request.method} ${request.url} ${statusCode} +${elapsedMs}ms${actor}`;
  }

  private resolveStatus(error: unknown): number {
    return error instanceof HttpException
      ? error.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
