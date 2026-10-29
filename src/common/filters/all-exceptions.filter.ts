import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof MulterError) {
      const status = HttpStatus.BAD_REQUEST;
      const message =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5 MB or smaller.'
          : exception.message;
      response.status(status).json({ statusCode: status, message });
      return;
    }

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttp
      ? exception.getResponse()
      : 'Internal server error';

    if (!isHttp) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body =
      typeof message === 'string'
        ? { statusCode: status, message }
        : { statusCode: status, ...(message as object) };

    response.status(status).json(body);
  }
}
