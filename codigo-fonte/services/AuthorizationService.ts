
import { User } from '../domain/User'
import { UnauthorizedError } from '../errors/UnauthorizedError'

export class AuthorizationService {
  static requireSuperAdmin(user: User) {
    if (user.role !== 'super_admin') {
      throw new UnauthorizedError()
    }
  }
}
