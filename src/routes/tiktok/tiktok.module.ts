import { Module } from '@nestjs/common';
import { TiktokService } from './services/tiktok.service';
import { TiktokController } from './controllers/tiktok.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [TiktokService, PrismaService],
  controllers: [TiktokController],
})
export class TiktokModule {}
