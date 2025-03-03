import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  IReportGenerator,
  ReportData,
} from '../interfaces/report-data.interfaces';

@Injectable()
export class PdfService implements IReportGenerator {
  async generateReport(data: ReportData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    let yOffset = page.getHeight() - 50;

    page.drawText(`Informe: ${data.title}`, {
      x: 50,
      y: yOffset,
      font,
      size: 20,
      color: rgb(0, 0, 0),
    });
    yOffset -= 40;

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    const fechaFormateada = data.date.toLocaleDateString('es-ES', options);
    page.drawText(`Generado el: ${fechaFormateada}`, {
      x: 50,
      y: yOffset,
      font,
      size: fontSize,
    });
    yOffset -= 30;

    page.drawText('Métricas Generales:', {
      x: 50,
      y: yOffset,
      font,
      size: fontSize + 2,
      color: rgb(0.2, 0.2, 0.8),
    });
    yOffset -= 20;

    const metrics = [
      `Vistas Totales: ${data.metrics.totalViews.toLocaleString('es-ES')}`,
      `Me gusta Totales: ${data.metrics.totalLikes.toLocaleString('es-ES')}`,
      `Compartidos Totales: ${data.metrics.totalShares.toLocaleString('es-ES')}`,
      `Comentarios Totales: ${data.metrics.totalComments.toLocaleString('es-ES')}`,
    ];

    metrics.forEach((metric) => {
      page.drawText(metric, {
        x: 70,
        y: yOffset,
        font,
        size: fontSize,
      });
      yOffset -= 20;
    });
    yOffset -= 20;

    page.drawText('Detalles de Videos:', {
      x: 50,
      y: yOffset,
      font,
      size: fontSize + 2,
      color: rgb(0.2, 0.2, 0.8),
    });
    yOffset -= 30;

    const headers = [
      'Título',
      'Vistas',
      'Me gusta',
      'Compartidos',
      'Comentarios',
      'Fecha',
    ];
    const columnWidths = [250, 80, 80, 80, 80, 100];
    let xOffset = 50;

    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xOffset,
        y: yOffset,
        font,
        size: fontSize,
        color: rgb(0.3, 0.3, 0.3),
      });
      xOffset += columnWidths[index];
    });
    yOffset -= 20;

    data.videos.forEach((video) => {
      if (yOffset < 50) {
        page = pdfDoc.addPage();
        yOffset = page.getHeight() - 50;
      }

      xOffset = 50;
      const rowData = [
        video.title.substring(0, 30),
        video.views.toLocaleString('es-ES'),
        video.likes.toLocaleString('es-ES'),
        video.shares.toLocaleString('es-ES'),
        video.comments.toLocaleString('es-ES'),
        video.createdAt.toLocaleDateString('es-ES', options),
      ];

      rowData.forEach((text, index) => {
        page.drawText(text, {
          x: xOffset,
          y: yOffset,
          font,
          size: fontSize - 2,
        });
        xOffset += columnWidths[index];
      });
      yOffset -= 20;
    });

    const footerPage = pdfDoc.getPageCount();
    for (let i = 0; i < footerPage; i++) {
      const currentPage = pdfDoc.getPage(i);
      currentPage.drawText(`Página ${i + 1} de ${footerPage}`, {
        x: currentPage.getWidth() - 150,
        y: 30,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const fechaHoraActual = new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      currentPage.drawText(`Generado: ${fechaHoraActual}`, {
        x: 50,
        y: 30,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
