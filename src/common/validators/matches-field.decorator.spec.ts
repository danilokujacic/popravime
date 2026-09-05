import { validate } from 'class-validator';
import { MatchesField } from './matches-field.decorator';

class TestDto {
  password: string;

  @MatchesField('password')
  repeatPassword: string;
}

function BuildDto(password: string, repeatPassword: string): TestDto {
  const dto = new TestDto();
  dto.password = password;
  dto.repeatPassword = repeatPassword;
  return dto;
}

describe('MatchesField', () => {
  it('passes when the two fields match', async () => {
    const errors = await validate(BuildDto('secret123', 'secret123'));
    expect(errors).toHaveLength(0);
  });

  it('fails when the two fields differ', async () => {
    const errors = await validate(BuildDto('secret123', 'different'));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('matchesField');
  });
});
