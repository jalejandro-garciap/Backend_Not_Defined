import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SocialMedia, User } from '@prisma/client';
import {
  AuthenticatedGuard,
  GoogleAuthGuard,
  InstagramAuthGuard,
  TiktokAuthGuard,
  YouTubeAuthGuard,
} from '../guards/AuthGuard';
import { Request, Response } from 'express';
import { UserService } from 'src/routes/user/services/user.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { AuthUser } from 'src/utils/decorators';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject() private readonly userService: UserService,
    private readonly tokenRefreshService: TokenRefreshService,
  ) {}

  @Get('login/google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    return 'login';
  }

  @Get('redirect/google')
  @UseGuards(GoogleAuthGuard)
  async googleRedirect(@Req() req, @Res() res: Response) {
    res.redirect(process.env.FRONTEND_URL);
  }

  @Get('login/tiktok')
  @UseGuards(TiktokAuthGuard)
  loginG() {
    return 'login';
  }

  @Get('redirect/tiktok')
  @UseGuards(TiktokAuthGuard)
  redirectG(@Res() res: Response) {
    res.redirect(process.env.FRONTEND_URL);
  }

  @Get('login/instagram')
  @UseGuards(InstagramAuthGuard)
  async instagramAuth() {
    return 'login';
  }

  @Get('redirect/instagram')
  @UseGuards(InstagramAuthGuard)
  async instagramAuthCallback(@Res() res) {
    res.redirect(process.env.FRONTEND_URL);
  }

  @Get('login/youtube')
  @UseGuards(YouTubeAuthGuard)
  async youtubeAuth() {
    return 'login';
  }

  @Get('redirect/youtube')
  @UseGuards(YouTubeAuthGuard)
  async youtubeAuthCallback(@Res() res) {
    res.redirect(process.env.FRONTEND_URL);
  }

  @Get('status')
  @UseGuards(AuthenticatedGuard)
  async status(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Res() res: Response,
  ) {
    const userWithTokenStatus = await this.userService.getUserWithTokenStatus(
      user.id,
    );
    res.send(userWithTokenStatus);
  }

  @Get('user/:id')
  @UseGuards(AuthenticatedGuard)
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Delete('logout')
  @UseGuards(AuthenticatedGuard)
  logout(@Res() res: Response, @Req() req: Request) {
    req.logout((e) => {
      if (e) console.error(e);
      res.sendStatus(200);
    });
  }

  @Delete('social-media/:name')
  async deleteSocialMedia(@Param('name') name: string, @AuthUser() user: User) {
    const socialMedia = await this.userService.getSocialMediaByNameAndUserId(
      name,
      user.id,
    );
    if (!socialMedia) throw new Error('Social media not found');
    return this.userService.deleteSocialMedia(socialMedia.id);
  }

  @Post('refresh-tokens')
  async refreshTokens(@AuthUser() user: User) {
    const userWithTokens = await this.userService.getUserWithTokenStatus(
      user.id,
    );

    if (!userWithTokens?.social_medias) {
      return { message: 'No hay redes sociales conectadas' };
    }

    const refreshResults = [];

    for (const socialMedia of userWithTokens.social_medias) {
      if (socialMedia.token_expires_at) {
        const result =
          await this.tokenRefreshService.checkAndRefreshTokenIfNeeded(
            socialMedia,
          );
        refreshResults.push({
          socialMedia: socialMedia.social_media_name,
          success: !!result,
          newToken: !!result,
        });
      }
    }

    return {
      message: 'Proceso de renovación completado',
      results: refreshResults,
    };
  }

  @Post('admin/refresh-all-tokens')
  @UseGuards(AuthenticatedGuard)
  async refreshAllTokens(@AuthUser() user: User) {
    // Verificar que el usuario sea administrador
    if (user.role !== 'ADMIN') {
      throw new Error('Solo los administradores pueden realizar esta acción');
    }

    try {
      await this.tokenRefreshService.refreshAllExpiredTokens();
      return {
        message: 'Renovación masiva de tokens completada exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        message: 'Error en la renovación masiva de tokens',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('admin/token-status')
  @UseGuards(AuthenticatedGuard)
  async getTokenStatus(@AuthUser() user: User) {
    // Verificar que el usuario sea administrador
    if (user.role !== 'ADMIN') {
      throw new Error(
        'Solo los administradores pueden acceder a esta información',
      );
    }

    const expiringSocialMedias =
      await this.userService.getExpiringSocialMediaTokens();

    return {
      expiring_tokens: expiringSocialMedias.length,
      tokens: expiringSocialMedias.map((sm) => ({
        id: sm.id,
        social_media: sm.social_media_name,
        username: sm.username,
        user: sm.user.username,
        expires_at: sm.token_expires_at,
        days_until_expiry: Math.floor(
          (new Date(sm.token_expires_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
      timestamp: new Date().toISOString(),
    };
  }
}
