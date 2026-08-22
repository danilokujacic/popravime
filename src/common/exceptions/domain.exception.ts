export abstract class DomainException extends Error {
  abstract readonly httpStatus: number;

  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
