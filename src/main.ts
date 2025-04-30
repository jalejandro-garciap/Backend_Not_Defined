import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as passport from 'passport';
import { PrismaClient } from '@prisma/client';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';

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
    origin: ['http://localhost:5173', process.env.FRONTEND_URL],
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

  await app.listen(4000);
}
bootstrap();
