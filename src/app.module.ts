import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './routes/prisma/prisma.module';
import { UserModule } from './routes/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './routes/auth/auth.module';
import { TiktokModule } from './routes/tiktok/tiktok.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    TiktokModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
