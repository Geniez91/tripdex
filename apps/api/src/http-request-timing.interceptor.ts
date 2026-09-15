import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { catchError, finalize, throwError } from 'rxjs';
import { LOGGER_CONTEXT } from './logger.constants.js';

@Injectable()
export class HttpRequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LOGGER_CONTEXT.HTTP_REQUEST_TIMING);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; path: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const startedAt = performance.now();
    let errorStatus: number | null = null;

    return next.handle().pipe(
      catchError(error => {
        errorStatus = error instanceof HttpException ? error.getStatus() : 500;
        return throwError(() => error);
      }),
      finalize(() => {
        const duration = Math.round(performance.now() - startedAt);
        const status = errorStatus ?? response.statusCode;
        this.logger.log(`${request.method} ${request.path} ${status} ${duration}ms`);
      }),
    );
  }
}
