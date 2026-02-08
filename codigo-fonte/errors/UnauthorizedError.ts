
export class UnauthorizedError extends Error {
  constructor() {
    super('Usuário não autorizado')
  }
}
