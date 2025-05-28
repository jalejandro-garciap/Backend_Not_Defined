import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as passport from 'passport';
import { PrismaClient } from '@prisma/client';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';

// Polyfill para crypto.randomUUID compatible con Railway y otros entornos
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
  try {
    const { webcrypto } = require('crypto');
    if (!globalThis.crypto) {
      globalThis.crypto = webcrypto;
    } else if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = webcrypto.randomUUID.bind(webcrypto);
    }
  } catch (error) {
    // Fallback para entornos que no soportan webcrypto
    console.warn('webcrypto no disponible, usando fallback para randomUUID');
    if (!globalThis.crypto) {
      globalThis.crypto = {} as any;
    }
    globalThis.crypto.randomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}

async function bootstrap() {
  // const httpsOptions = {
  //   key: fs.readFileSync('./src/key.pem'),
  //   cert: fs.readFileSync('./src/cert.pem'),
  // };

  const app = await NestFactory.create(AppModule, {});

  if (process.env.NODE_ENV !== 'production') {
    app.setGlobalPrefix('/api');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.use(
    session({
      secret: process.env.COOKIE_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 86400000,
      },
      store: new PrismaSessionStore(new PrismaClient(), {
        checkPeriod: 2 * 60 * 1000,
        dbRecordIdIsSessionId: undefined,
        dbRecordIdFunction: undefined,
      }),
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware personalizado para manejar autenticaciones sociales sin sobreescribir la sesión principal
  app.use((req, res, next) => {
    const originalLogin = req.logIn;

    req.logIn = function (user, options, done) {
      if (user && user.socialConnection && req.user) {
        if (typeof done === 'function') {
          return done(null);
        }
        return Promise.resolve();
      }

      return originalLogin.apply(this, arguments);
    };

    next();
  });

  const port = process.env.PORT || 3001;
  console.log(`🚀 Servidor iniciando en puerto ${port}`);
  console.log(`🌍 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  await app.listen(port);
}
bootstrap();
