import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { ValidationFieldError } from '../validation/validation-field-error.interface';

interface ErrorBody {
  code: string;
  message: string;
  fields?: ValidationFieldError[];
  statusCode: number;
  path: string;
  timestamp: string;
}

const SERVER_ERROR_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;

interface HttpExceptionBody {
  message?: string | string[];
  code?: string;
  fields?: ValidationFieldError[];
}

function HasMessage(body: object): body is HttpExceptionBody {
  return 'message' in body;
}

function ExtractHttpBody(exception: HttpException): {
  code: string;
  message: string;
  fields?: ValidationFieldError[];
} {
  const body = exception.getResponse();
  if (typeof body === 'string') {
    return { code: exception.name, message: body };
  }
  if (HasMessage(body) && body.message !== undefined) {
    const message = body.message;
    return {
      code: body.code ?? exception.name,
      message: Array.isArray(message) ? message.join(', ') : message,
      fields: body.fields,
    };
  }
  return { code: exception.name, message: exception.message };
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(DomainExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorBody = this.BuildErrorBody(exception, request.url);
    this.LogException(exception, errorBody, request.ip);

    response.status(errorBody.statusCode).json({ error: errorBody });
  }

  private BuildErrorBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainException) {
      return {
        code: exception.code,
        message: exception.message,
        statusCode: exception.httpStatus,
        path,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      const { code, message, fields } = ExtractHttpBody(exception);
      return {
        code,
        message,
        fields,
        statusCode: exception.getStatus(),
        path,
        timestamp,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path,
      timestamp,
    };
  }

  private LogException(
    exception: unknown,
    errorBody: ErrorBody,
    ip: string | undefined,
  ): void {
    const logPayload = {
      code: errorBody.code,
      statusCode: errorBody.statusCode,
      path: errorBody.path,
      ip,
    };

    if (errorBody.statusCode >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        {
          ...logPayload,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        errorBody.message,
      );
      return;
    }

    this.logger.warn(logPayload, errorBody.message);
  }
}
