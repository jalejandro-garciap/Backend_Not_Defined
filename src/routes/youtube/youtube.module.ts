import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportModule } from 'src/reports/reports.module';
import { YoutubeService } from './services/youtube.service';
import { YoutubeController } from './controllers/youtube.controller';

@Module({
  imports: [HttpModule, forwardRef(() => ReportModule)],
  providers: [YoutubeService, PrismaService],
  controllers: [YoutubeController],
  exports: [YoutubeService]
})
export class YouTubeModule {}
