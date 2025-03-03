import { forwardRef, Module } from '@nestjs/common';
import { TiktokService } from './services/tiktok.service';
import { TiktokController } from './controllers/tiktok.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { ReportModule } from 'src/reports/reports.module';

@Module({
  imports: [HttpModule, forwardRef(() => ReportModule)],
  exports: [TiktokService],
  providers: [TiktokService, PrismaService],
  controllers: [TiktokController],
})
export class TiktokModule {}
