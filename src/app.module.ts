import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './routes/prisma/prisma.module';
import { UserModule } from './routes/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './routes/auth/auth.module';
import { TiktokModule } from './routes/tiktok/tiktok.module';
import { InstagramModule } from './routes/instagram/instagram.module';
import { ReportModule } from './reports/reports.module';
import { YoutubeModule } from './routes/youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    TiktokModule,
    InstagramModule,
    YoutubeModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
