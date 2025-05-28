import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './routes/auth/auth.module';
import { UserModule } from './routes/user/user.module';
import { ReportModule } from './reports/reports.module';
import { YouTubeModule } from './routes/youtube/youtube.module';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './routes/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // Habilita los cron jobs
    PrismaModule,
    SharedModule,
    HealthModule,
    AuthModule,
    UserModule,
    ReportModule,
    YouTubeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
