import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly userService: UserService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const socialMediaRoutes = ['/instagram', '/youtube', '/tiktok'];
    const shouldCheckTokens = socialMediaRoutes.some((route) =>
      request.url.includes(route),
    );

    if (user && shouldCheckTokens) {
      try {
        const userWithTokens = await this.userService.getUserWithTokenStatus(
          user.id,
        );

        if (userWithTokens?.social_medias) {
          for (const socialMedia of userWithTokens.social_medias) {
            if (socialMedia.token_expires_at) {
              await this.tokenRefreshService.checkAndRefreshTokenIfNeeded(
                socialMedia,
              );
            }
          }
        }
      } catch (error) {
        console.error('Error al verificar tokens en interceptor:', error);
      }
    }

    return next.handle();
  }
}
