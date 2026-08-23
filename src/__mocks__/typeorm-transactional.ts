export function Transactional(): MethodDecorator {
  return () => undefined;
}

export function initializeTransactionalContext(): undefined {
  return undefined;
}

export function addTransactionalDataSource<T>(dataSource: T): T {
  return dataSource;
}

export function getDataSourceByName(): undefined {
  return undefined;
}

export function runOnTransactionCommit(): never {
  throw new Error(
    'No hook manager found in context. Are you using @Transactional()?',
  );
}
