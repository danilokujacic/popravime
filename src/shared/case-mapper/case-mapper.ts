function CamelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function IsOpaqueValue(value: object): boolean {
  return (
    value instanceof Date || value instanceof RegExp || Buffer.isBuffer(value)
  );
}

function IsConvertibleObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !IsOpaqueValue(value);
}

export class CaseMapper {
  static KeyToSnakeCase(key: string): string {
    return CamelToSnake(key);
  }

  static ToSnakeCase(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => CaseMapper.ToSnakeCase(item));
    }

    if (IsConvertibleObject(value)) {
      return Object.entries(value).reduce<Record<string, unknown>>(
        (accumulator, [key, propertyValue]) => {
          accumulator[CamelToSnake(key)] =
            CaseMapper.ToSnakeCase(propertyValue);
          return accumulator;
        },
        {},
      );
    }

    return value;
  }
}
