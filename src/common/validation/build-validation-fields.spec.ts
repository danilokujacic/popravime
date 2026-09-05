import { IsEmail, IsString, MinLength, validate } from 'class-validator';
import { BuildValidationFields } from './build-validation-fields';

class TestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

describe('BuildValidationFields', () => {
  it('maps each failing field to its snake_case name and screaming-snake-case codes', async () => {
    const dto = new TestDto();
    dto.email = 'not-an-email';
    dto.password = 'short';

    const errors = await validate(dto);
    const fields = BuildValidationFields(errors);

    expect(fields).toEqual(
      expect.arrayContaining([
        { field: 'email', codes: ['IS_EMAIL'] },
        { field: 'password', codes: ['MIN_LENGTH'] },
      ]),
    );
  });

  it('returns no fields when validation passes', async () => {
    const dto = new TestDto();
    dto.email = 'ana@popravime.me';
    dto.password = 'password123';

    const errors = await validate(dto);

    expect(BuildValidationFields(errors)).toEqual([]);
  });
});
