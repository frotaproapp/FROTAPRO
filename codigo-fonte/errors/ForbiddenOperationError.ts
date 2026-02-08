
export class ForbiddenOperationError extends Error {
  constructor() {
    super('Operação não permitida no modo restrito')
  }
}
