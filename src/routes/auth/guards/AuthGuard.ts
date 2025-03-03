import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TiktokAuthGuard extends AuthGuard('tiktok') {
  private readonly logger = new Logger(TiktokAuthGuard.name);

  async canActivate(context: ExecutionContext) {
    try {
      const activate = (await super.canActivate(context)) as boolean;
      const request = context.switchToHttp().getRequest();
      await super.logIn(request);
      this.logger.log(`Login successful: ${JSON.stringify(request.user)}`);
      return activate;
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }
}

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticatedGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const isAuthenticated = req.isAuthenticated();

    this.logger.debug(`isAuthenticated: ${isAuthenticated}`);
    this.logger.debug(`Session: ${JSON.stringify(req.session || {})}`);
    this.logger.debug(`User: ${JSON.stringify(req.user || {})}`);

    if (!isAuthenticated) {
      throw new UnauthorizedException('No estás autenticado');
    }

    return true;
  }
}
