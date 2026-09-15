import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { LOGGER_CONTEXT } from './logger.constants.js';

@Catch()
@Injectable()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(LOGGER_CONTEXT.GLOBAL_EXCEPTION_FILTER);

  constructor(private readonly adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      super.catch(exception, host);
      return;
    }

    const request = host.switchToHttp().getRequest<{
      method: string;
      path: string;
    }>();
    this.logUnexpected(exception, request.method, request.path);
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private logUnexpected(exception: unknown, method: string, path: string): void {
    if (exception instanceof Error) {
      this.logger.error(
        `Unexpected HTTP error: ${method} ${path} (${exception.name})`,
        exception.stack,
      );
      return;
    }

    this.logger.error(`Unexpected HTTP error: ${method} ${path} (non-Error)`);
  }
}
