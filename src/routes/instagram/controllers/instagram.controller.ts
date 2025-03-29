import {
  Body,
  Controller,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/routes/auth/guards/AuthGuard';
import { Response } from 'express';
import { ReportFormat } from 'src/reports/interfaces/report-data.interfaces';
import { MultiUserReportService } from 'src/reports/services/multi-user-report.service';

@Controller('instagram')
export class InstagramController {
  constructor(
    @Inject() private readonly multiUserReportService: MultiUserReportService,
  ) {}

  @Post('multi-user-report')
  @UseGuards(AuthenticatedGuard)
  // @UseGuards(RolesGuard)
  async generateMultiUserReport(
    @Body()
    dto: {
      userIds: string[];
      startDate?: string;
      endDate?: string;
    },
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ) {
    const reportFormat =
      format.toLowerCase() === 'csv' ? ReportFormat.CSV : ReportFormat.PDF;

    try {
      const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
      const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

      if (startDate && isNaN(startDate.getTime())) {
        return res
          .status(400)
          .send({ message: 'Formato de fecha de inicio inválido' });
      }

      if (endDate && isNaN(endDate.getTime())) {
        return res
          .status(400)
          .send({ message: 'Formato de fecha de fin inválido' });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).send({
          message:
            'La fecha de inicio debe ser anterior o igual a la fecha de fin',
        });
      }

      const buffer =
        await this.multiUserReportService.generateMultiUserInstagramReport(
          dto.userIds,
          reportFormat,
          startDate,
          endDate,
        );

      if (reportFormat === ReportFormat.CSV) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=tiktok-multi-user-report.csv',
        );
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=tiktok-multi-user-report.pdf',
        );
      }

      res.send(buffer);
    } catch (error) {
      console.error('Error generating multi-user report:', error);
      res
        .status(500)
        .send({ message: 'Error generating report', error: error.message });
    }
  }
}
