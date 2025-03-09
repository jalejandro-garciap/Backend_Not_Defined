import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { YoutubeService } from './services/youtube.service';
import { YoutubeController } from './controllers/youtube.controller';

@Module({
  imports: [HttpModule],
  providers: [YoutubeService, PrismaService],
  controllers: [YoutubeController],
})
export class YoutubeModule {}
