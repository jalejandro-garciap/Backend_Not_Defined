import { forwardRef, Module } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import { ReportService } from './services/report.service';
import { TiktokModule } from '../routes/tiktok/tiktok.module';

@Module({
  imports: [forwardRef(() => TiktokModule)],
  providers: [PdfService, ReportService],
  exports: [ReportService],
})
export class ReportModule {}