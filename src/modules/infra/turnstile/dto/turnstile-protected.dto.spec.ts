import { ValidationPipe } from '@nestjs/common';
import { CreateContactMessageDto } from '../../../contact-messages/dto/create-contact-message.dto';
import { ResendConfirmationDto } from '../../../auth/dto/resend-confirmation.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('TurnstileProtectedDto', () => {
  it('accepts turnstile_token on the wire and maps it to turnstileToken', async () => {
    const dto = await pipe.transform(
      { email: 'a@example.com', turnstile_token: 'token-1' },
      { type: 'body', metatype: ResendConfirmationDto },
    );

    expect(dto).toBeInstanceOf(ResendConfirmationDto);
    expect(dto.turnstileToken).toBe('token-1');
  });

  it('keeps the token optional so a deployment without a secret key still works', async () => {
    const dto = await pipe.transform(
      {
        name: 'Ana',
        email: 'a@example.com',
        subject: 'Hello',
        message: 'Hello there',
      },
      { type: 'body', metatype: CreateContactMessageDto },
    );

    expect(dto.turnstileToken).toBeUndefined();
  });

  it('still rejects unknown fields', async () => {
    await expect(
      pipe.transform(
        { email: 'a@example.com', unexpected: 'x' },
        { type: 'body', metatype: ResendConfirmationDto },
      ),
    ).rejects.toThrow();
  });

  it('rejects a token above the size Cloudflare issues', async () => {
    await expect(
      pipe.transform(
        { email: 'a@example.com', turnstile_token: 'x'.repeat(2049) },
        { type: 'body', metatype: ResendConfirmationDto },
      ),
    ).rejects.toThrow();
  });
});
