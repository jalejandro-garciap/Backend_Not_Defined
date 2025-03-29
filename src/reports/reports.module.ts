import { forwardRef, Module } from '@nestjs/common';
import { PdfService } from './services/utils/pdf.service';
import { ReportService } from './services/report.service';
import { TiktokModule } from '../routes/tiktok/tiktok.module';
import { ChartService } from './services/utils/chart.service';
import { CsvService } from './services/utils/csv.service';
import { MultiUserReportService } from './services/multi-user-report.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InstagramModule } from 'src/routes/instagram/instagram.module';

@Module({
  imports: [
    forwardRef(() => TiktokModule),
    forwardRef(() => InstagramModule),
    PrismaModule,
  ],
  providers: [
    PdfService,
    ReportService,
    ChartService,
    CsvService,
    MultiUserReportService,
  ],
  exports: [ReportService, MultiUserReportService],
})
export class ReportModule {}
