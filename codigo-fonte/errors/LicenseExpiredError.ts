
export class LicenseExpiredError extends Error {
  constructor() {
    super('Licença expirada ou inexistente')
  }
}
