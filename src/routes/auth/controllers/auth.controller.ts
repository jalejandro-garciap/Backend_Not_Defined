import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
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
import { AuthUser } from 'src/utils/decorators';

@Controller('auth')
export class AuthController {
  constructor(@Inject() private readonly userService: UserService) {}

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
  status(
    @AuthUser() user: User & { social_medias: SocialMedia[] },
    @Res() res: Response,
  ) {
    res.send(user);
  }

  @Get('user/:id')
  @UseGuards(AuthenticatedGuard)
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Delete('social-media/:name')
  @UseGuards(AuthenticatedGuard)
  async deleteSocialMedia(@Param('name') name: string, @AuthUser() user: User) {
    const socialMedia = await this.userService.getSocialMediaByNameAndUserId(
      name,
      user.id,
    );
    if (!socialMedia) throw new Error('Social media not found');
    return this.userService.deleteSocialMedia(socialMedia.id);
  }

  @Delete('logout')
  @UseGuards(AuthenticatedGuard)
  logout(@Res() res: Response, @Req() req: Request) {
    req.logout((e) => {
      if (e) console.error(e);
      res.sendStatus(200);
    });
  }
}
