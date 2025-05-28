import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './routes/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './routes/auth/auth.module';
import { TiktokModule } from './routes/tiktok/tiktok.module';
import { ReportModule } from './reports/reports.module';
import { InstagramModule } from './routes/instagram/instagram.module';
import { RequestModule } from './routes/request/request.module';
import { YouTubeModule } from './routes/youtube/youtube.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SharedModule,
    AuthModule,
    UserModule,
    TiktokModule,
    ReportModule,
    InstagramModule,
    YouTubeModule,
    RequestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
