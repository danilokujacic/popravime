import { UseGuards } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';

export const RequireTurnstile = (): MethodDecorator & ClassDecorator =>
  UseGuards(TurnstileGuard);
