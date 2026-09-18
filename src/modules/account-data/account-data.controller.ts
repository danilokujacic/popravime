import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AccountErasureService } from './account-erasure.service';
import { AccountExportService } from './account-export.service';
import { AccountExport } from './account-data.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { AllowUnacceptedTerms } from '../../common/decorators/allow-unaccepted-terms.decorator';
import { AUTH_THROTTLE } from '../infra/rate-limit/rate-limit.constants';
import { PrivateFileUrlInterceptor } from '../infra/storage/private-file-url.interceptor';

@AllowUnacceptedTerms()
@Controller('users/me')
@UseInterceptors(PrivateFileUrlInterceptor)
export class AccountDataController {
  constructor(
    private readonly accountErasureService: AccountErasureService,
    private readonly accountExportService: AccountExportService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Get('export')
  Export(@CurrentUser() user: AuthenticatedUser): Promise<AccountExport> {
    return this.accountExportService.Export(user);
  }

  @Throttle(AUTH_THROTTLE)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  Erase(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.accountErasureService.Erase(user);
  }
}
