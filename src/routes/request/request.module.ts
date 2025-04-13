import { Module } from '@nestjs/common';
import { RequestService } from './services/request.service';
import { RequestController } from './controllers/request.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [RequestController],
  providers: [RequestService, PrismaService],
})
export class RequestModule {}