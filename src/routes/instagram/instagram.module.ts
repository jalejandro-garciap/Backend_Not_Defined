import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InstagramController } from './controllers/instagram.controller';
import { InstagramService } from './services/instagram.service';
import { ReportModule } from 'src/reports/reports.module';

@Module({
  imports: [HttpModule, forwardRef(() => ReportModule)],
  providers: [InstagramService, PrismaService],
  controllers: [InstagramController],
  exports: [InstagramService]
})
export class InstagramModule {}
