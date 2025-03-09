import { Module } from '@nestjs/common';
import { InstagramService } from './services/instagram.service';
import { InstagramController } from './controllers/instagram.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [InstagramService, PrismaService],
  controllers: [InstagramController],
})
export class InstagramModule {}
