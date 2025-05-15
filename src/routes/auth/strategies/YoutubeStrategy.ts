import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy as YoutubeV3Strategy,
  VerifyCallback,
} from 'passport-youtube-v3';
import { AuthService } from '../services/auth.service';

@Injectable()
export class YoutubeStrategy extends PassportStrategy(YoutubeV3Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      callbackURL: process.env.YOUTUBE_CALLBACK_URL,
      passReqToCallback: true,
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
        'https://www.googleapis.com/auth/youtubepartner',
      ],
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('Perfil de YouTube recibido:', 
        JSON.stringify({
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
          _json: profile._json ? {
            scopes: profile._json.scope
          } : undefined
        }, null, 2)
      );
      
      // Verificar los scopes manualmente con una petición directa a la API de Google
      try {
        const axios = require('axios');
        const tokenInfo = await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
          params: { access_token: accessToken }
        });
        
        console.log('Token info completa:', tokenInfo.data);
        
        const grantedScopes = tokenInfo.data.scope ? tokenInfo.data.scope.split(' ') : [];
        console.log('Scopes concedidos:', grantedScopes);
        
        // Verificar si tenemos los scopes necesarios
        const requiredScopes = [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/yt-analytics.readonly'
        ];
        
        const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));
        if (missingScopes.length > 0) {
          console.warn('⚠️ Faltan permisos para YouTube Analytics:', missingScopes);
          console.warn('⚠️ Es posible que algunas funcionalidades de analytics no estén disponibles');
        } else {
          console.log('✅ Todos los permisos necesarios están concedidos');
        }
      } catch (error) {
        console.error('❌ Error al verificar el token de acceso:', error.response?.data || error.message);
      }
      
      const photo =
        profile.photos && profile.photos[0]
          ? profile.photos[0].value
          : 'no-photo';
      const email =
        profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      const user = await this.authService.validateSocialMedia(
        {
          id: profile.id,
          social_media_name: 'youtube',
          username: profile.displayName,
          img: photo,
          email,
          accessToken,
          refreshToken,
        },
        req,
      );
      done(null, user);
    } catch (err) {
      console.error('❌ Error en validación de Youtube Strategy:', err);
      done(err, false);
    }
  }
}
