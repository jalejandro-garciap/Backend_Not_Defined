import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  IReportGenerator,
  ReportData,
} from '../../interfaces/report-data.interfaces';
import * as QRCode from 'qrcode';

@Injectable()
export class PdfService implements IReportGenerator {
  async generateReport(data: ReportData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    await this.createCoverPage(pdfDoc, data);

    await this.createSummaryPage(pdfDoc, data);

    await this.createChartsPage(pdfDoc, data);

    await this.createMediaDetailPage(pdfDoc, data);

    await this.createQRCodesPage(pdfDoc, data);

    await this.addFooters(pdfDoc);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateMultiUserReport(data: ReportData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    await this.createCoverPage(pdfDoc, data);
    await this.createSummaryPage(pdfDoc, data);

    if (data.users && data.users.length > 1) {
      await this.createUserComparisonPage(pdfDoc, data);
    }

    await this.createChartsPage(pdfDoc, data);
    await this.createMediaDetailPage(pdfDoc, data, true);
    await this.createQRCodesPage(pdfDoc, data);
    await this.addFooters(pdfDoc);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async createCoverPage(pdfDoc: PDFDocument, data: ReportData) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(data.title.toLocaleUpperCase(), {
      x: (width - 370) / 2,
      y: height - 150,
      size: 24,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    page.drawText(data.subtitle, {
      x: (width - 320) / 2,
      y: height - 190,
      size: 22,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
    const fechaFormateada = data.date.toLocaleDateString('es-ES', options);

    page.drawText(`Generado el: ${fechaFormateada}`, {
      x: (width - 200) / 2,
      y: height - 250,
      size: 12,
      font: regularFont,
    });

    const metricsY = height - 320;
    const metricBoxWidth = width - 100;

    page.drawRectangle({
      x: 50,
      y: metricsY - 140,
      width: metricBoxWidth,
      height: 130,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      color: rgb(0.97, 0.97, 0.97),
      opacity: 0.5,
    });

    page.drawText('MÉTRICAS DESTACADAS', {
      x: 70,
      y: metricsY,
      size: 16,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    const metrics = [
      [`Vistas Totales:`, `${data.metrics.totalViews.toLocaleString('es-ES')}`],
      [`Me gusta:`, `${data.metrics.totalLikes.toLocaleString('es-ES')}`],
      [`Comentarios:`, `${data.metrics.totalComments.toLocaleString('es-ES')}`],
      [`Compartidos:`, `${data.metrics.totalShares.toLocaleString('es-ES')}`],
      [`Engagement:`, `${data.metrics.averageEngagementRate.toFixed(2)}%`],
    ];

    if (data.isInstagram) {
      metrics.push([
        'Publicaciones guardadas:',
        data.metrics.totalSaved?.toLocaleString('es-ES') || '0',
      ]);
    } else {
      metrics.push([
        'Duración total (s):',
        data.metrics.totalDuration?.toLocaleString('es-ES') || '0',
      ]);
    }

    const colWidth = metricBoxWidth / 2;

    for (let i = 0; i < 3; i++) {
      page.drawText(metrics[i][0], {
        x: 70,
        y: metricsY - 30 - i * 30,
        size: 12,
        font,
      });

      page.drawText(metrics[i][1], {
        x: 200,
        y: metricsY - 30 - i * 30,
        size: 12,
        font: regularFont,
        color: rgb(0.2, 0.4, 0.8),
      });
    }

    for (let i = 0; i < 3; i++) {
      page.drawText(metrics[i + 3][0], {
        x: 70 + colWidth,
        y: metricsY - 30 - i * 30,
        size: 12,
        font,
      });

      page.drawText(metrics[i + 3][1], {
        x: 200 + colWidth,
        y: metricsY - 30 - i * 30,
        size: 12,
        font: regularFont,
        color: rgb(0.2, 0.4, 0.8),
      });
    }
  }

  private async createSummaryPage(pdfDoc: PDFDocument, data: ReportData) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('RESUMEN DE RENDIMIENTO', {
      x: 50,
      y: height - 60,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    page.drawLine({
      start: { x: 50, y: height - 75 },
      end: { x: width - 50, y: height - 75 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const topVideos = [...data.videos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    page.drawText('Top 5 Videos por Visualizaciones', {
      x: 50,
      y: height - 110,
      size: 14,
      font,
    });

    const headers = ['Título', 'Vistas', 'Me gusta', 'Comp.', 'Engage.'];
    const colWidths = [240, 70, 70, 70, 70];
    let xPos = 50;

    page.drawRectangle({
      x: 50,
      y: height - 135,
      width: width - 100,
      height: 20,
      color: rgb(0.95, 0.95, 0.98),
    });

    headers.forEach((header, i) => {
      page.drawText(header, {
        x: xPos + 5,
        y: height - 130,
        size: 10,
        font,
      });
      xPos += colWidths[i];
    });

    let yPos = height - 155;
    topVideos.forEach((video, idx) => {
      xPos = 50;

      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 50,
          y: yPos - 5,
          width: width - 100,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      const rowData = [
        this.sanitizeText(video.title).length > 28
          ? this.sanitizeText(video.title).substring(0, 28) + '...'
          : this.sanitizeText(video.title),
        video.views.toLocaleString('es-ES'),
        video.likes.toLocaleString('es-ES'),
        video.shares.toLocaleString('es-ES'),
        `${video.engagementRate.toFixed(1)}%`,
      ];

      rowData.forEach((text, i) => {
        page.drawText(text, {
          x: xPos + 5,
          y: yPos,
          size: 9,
          font: regularFont,
        });
        xPos += colWidths[i];
      });

      yPos -= 20;
    });

    page.drawText('Análisis de Tendencias', {
      x: 50,
      y: yPos - 30,
      size: 14,
      font,
    });

    page.drawRectangle({
      x: 50,
      y: yPos - 100,
      width: width - 100,
      height: 60,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98),
    });

    const ordenCronologico = [...data.videos].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const primeraMitad = ordenCronologico.slice(
      0,
      Math.floor(ordenCronologico.length / 2),
    );
    const segundaMitad = ordenCronologico.slice(
      Math.floor(ordenCronologico.length / 2),
    );

    const promedioVistasPrimero =
      primeraMitad.reduce((sum, v) => sum + v.views, 0) /
      (primeraMitad.length || 1);
    const promedioVistasSegundo =
      segundaMitad.reduce((sum, v) => sum + v.views, 0) /
      (segundaMitad.length || 1);

    const tendenciaTexto =
      promedioVistasSegundo > promedioVistasPrimero
        ? 'En aumento. Los videos más recientes tienen mejor rendimiento.'
        : 'En descenso. Los videos más antiguos tuvieron mejor rendimiento.';

    page.drawText('Tendencia general de visualizaciones:', {
      x: 60,
      y: yPos - 55,
      size: 10,
      font,
    });

    page.drawText(tendenciaTexto, {
      x: 60,
      y: yPos - 75,
      size: 10,
      font: regularFont,
      lineHeight: 14,
      maxWidth: width - 120,
    });
  }

  private async createChartsPage(pdfDoc: PDFDocument, data: ReportData) {
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let yPos;

    page.drawText('ANÁLISIS GRÁFICO', {
      x: 50,
      y: height - 60,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    page.drawLine({
      start: { x: 50, y: height - 75 },
      end: { x: width - 50, y: height - 75 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const chartWidth = width - 100;
    const chartHeight = 180;

    const spacing = 20;

    if (data.charts?.viewsChartBase64) {
      page.drawText('Visualizaciones por Video', {
        x: 50,
        y: height - 100,
        size: 12,
        font,
      });

      await this.insertChart(
        pdfDoc,
        page,
        data.charts.viewsChartBase64,
        50,
        height - 120,
        chartWidth,
        chartHeight,
      );
    }

    if (data.charts?.engagementChartBase64) {
      page.drawText('Tasa de Engagement por Video', {
        x: 50,
        y: height - 120 - chartHeight - spacing,
        size: 12,
        font,
      });

      await this.insertChart(
        pdfDoc,
        page,
        data.charts.engagementChartBase64,
        50,
        height - 140 - chartHeight - spacing,
        chartWidth,
        chartHeight,
      );
    }

    if (data.charts?.likesComparisonBase64) {
      page.drawText('Comparación de Me Gusta vs. Comentarios', {
        x: 50,
        y: height - 140 - (chartHeight + spacing) * 2,
        size: 12,
        font,
      });

      await this.insertChart(
        pdfDoc,
        page,
        data.charts.likesComparisonBase64,
        50,
        height - 160 - (chartHeight + spacing) * 2,
        chartWidth,
        chartHeight,
      );
    }

    if (data.charts?.engagementComparisonBase64) {
      if (height - 160 - (chartHeight + spacing) * 3 < 100) {
        page = pdfDoc.addPage();
        yPos = height - 80;

        page.drawText('ANÁLISIS GRÁFICO (CONTINUACIÓN)', {
          x: 50,
          y: yPos,
          size: 18,
          font,
          color: rgb(0.2, 0.2, 0.7),
        });

        yPos -= 40;
      } else {
        yPos = height - 160 - (chartHeight + spacing) * 3;
      }

      page.drawText('Relación entre Vistas y Engagement', {
        x: 50,
        y: yPos,
        size: 12,
        font,
      });

      await this.insertChart(
        pdfDoc,
        page,
        data.charts.engagementComparisonBase64,
        50,
        yPos - 20,
        450,
        180,
      );
    }
  }

  private async createMediaDetailPage(
    pdfDoc: PDFDocument,
    data: ReportData,
    isMultiUser: boolean = true,
  ) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('DETALLE DE VIDEOS', {
      x: 50,
      y: height - 60,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    page.drawLine({
      start: { x: 50, y: height - 75 },
      end: { x: width - 50, y: height - 75 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const headers = data.isInstagram
      ? [
          'Usuario',
          'Descripción',
          'Alcance',
          'Me gusta',
          'Com.',
          'Guard.',
          'Fecha',
        ]
      : [
          'Usuario',
          'Título',
          'Vistas',
          'Me gusta',
          'Com.',
          'Comp.',
          'Dur.(s)',
          'Fecha',
        ];

    const tableWidth = width - 100;
    const colWidths = data.isInstagram
      ? [
          Math.round(tableWidth * 0.15), // Usuario
          Math.round(tableWidth * 0.25), // Descripción
          Math.round(tableWidth * 0.12), // Alcance
          Math.round(tableWidth * 0.12), // Me gusta
          Math.round(tableWidth * 0.12), // Com.
          Math.round(tableWidth * 0.12), // Guard.
          Math.round(tableWidth * 0.12), // Fecha
        ]
      : [
          Math.round(tableWidth * 0.15), // Usuario
          Math.round(tableWidth * 0.25), // Título
          Math.round(tableWidth * 0.12), // Vistas
          Math.round(tableWidth * 0.12), // Me gusta
          Math.round(tableWidth * 0.09), // Com.
          Math.round(tableWidth * 0.09), // Comp.
          Math.round(tableWidth * 0.09), // Dur.
          Math.round(tableWidth * 0.09), // Fecha
        ];

    let xPos = 50;
    let yPos = height - 100;

    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: tableWidth,
      height: 20,
      color: rgb(0.95, 0.95, 0.98),
    });

    headers.forEach((header, i) => {
      page.drawText(header, {
        x: xPos + 5,
        y: yPos,
        size: 10,
        font,
      });
      xPos += colWidths[i];
    });

    yPos -= 25;

    let currentPage = page;
    let currentYPos = yPos;

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    };

    for (let i = 0; i < data.videos.length; i++) {
      const item = data.videos[i];

      if (currentYPos < 80) {
        currentPage = pdfDoc.addPage();
        currentYPos = height - 60;

        currentPage.drawText('DETALLE DE VIDEOS (CONTINUACIÓN)', {
          x: 50,
          y: currentYPos,
          size: 18,
          font,
          color: rgb(0.2, 0.2, 0.6),
        });

        currentPage.drawLine({
          start: { x: 50, y: currentYPos - 15 },
          end: { x: width - 50, y: currentYPos - 15 },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });

        currentYPos -= 40;

        xPos = 50;

        currentPage.drawRectangle({
          x: 50,
          y: currentYPos - 5,
          width: tableWidth,
          height: 20,
          color: rgb(0.95, 0.95, 0.98),
        });

        headers.forEach((header, i) => {
          currentPage.drawText(header, {
            x: xPos + 5,
            y: currentYPos,
            size: 10,
            font,
          });
          xPos += colWidths[i];
        });

        currentYPos -= 25;
      }

      if (i % 2 === 0) {
        currentPage.drawRectangle({
          x: 50,
          y: currentYPos - 5,
          width: tableWidth,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      xPos = 50;

      const maxTitleLength = Math.floor(colWidths[isMultiUser ? 1 : 0] / 4.5);

      const rowData = data.isInstagram
        ? [
            this.sanitizeText(item.username || 'Unknown'),
            maxTitleLength
              ? this.sanitizeText(item.title).substring(0, maxTitleLength) +
                '...'
              : this.sanitizeText(item.title),
            item.views.toLocaleString('es-ES'),
            item.likes.toLocaleString('es-ES'),
            item.comments.toLocaleString('es-ES'),
            (item.saved || 0).toLocaleString('es-ES'),
            item.createdAt.toLocaleDateString('es-ES', dateOptions),
          ]
        : [
            this.sanitizeText(item.username || 'Unknown'),
            maxTitleLength
              ? this.sanitizeText(item.title).substring(0, maxTitleLength) +
                '...'
              : this.sanitizeText(item.title),
            item.views.toLocaleString('es-ES'),
            item.likes.toLocaleString('es-ES'),
            item.comments.toLocaleString('es-ES'),
            item.shares.toLocaleString('es-ES'),
            String(item.duration || 0),
            item.createdAt.toLocaleDateString('es-ES', dateOptions),
          ];

      rowData.forEach((text, j) => {
        currentPage.drawText(text, {
          x: xPos + 5,
          y: currentYPos,
          size: 9,
          font: regularFont,
          maxWidth: colWidths[j] - 10,
        });
        xPos += colWidths[j];
      });

      currentYPos -= 20;
    }
  }

  private async createQRCodesPage(pdfDoc: PDFDocument, data: ReportData) {
    if (!data.videos || data.videos.length === 0) return;

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('ENLACES DE VIDEOS', {
      x: 50,
      y: height - 80,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.7),
    });

    const topVideos = [...data.videos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 9);

    const qrSize = 110;
    const qrPerRow = 3;
    const startX = 70;
    const startY = height - 140;
    const spacingX = qrSize + 60;
    const spacingY = qrSize + 60;

    for (let i = 0; i < topVideos.length; i++) {
      const video = topVideos[i];
      const row = Math.floor(i / qrPerRow);
      const col = i % qrPerRow;

      try {
        const qrCodeDataUrl = await QRCode.toDataURL(video.shareUrl, {
          margin: 1,
          width: 200,
        });

        const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

        const x = startX + col * spacingX;
        const y = startY - row * spacingY;

        page.drawImage(qrImage, {
          x,
          y: y - qrSize,
          width: qrSize,
          height: qrSize,
        });

        const title =
          this.sanitizeText(video.title).length > 20
            ? this.sanitizeText(video.title).substring(0, 20) + '...'
            : this.sanitizeText(video.title);

        page.drawText(title, {
          x,
          y: y - qrSize - 15,
          size: 9,
          font: regularFont,
          maxWidth: qrSize,
        });

        page.drawText(`${video.views.toLocaleString('es-ES')} vistas`, {
          x,
          y: y - qrSize - 30,
          size: 8,
          font: regularFont,
        });
      } catch (error) {
        console.error('Error al generar QR:', error);
      }
    }
  }

  private async addFooters(pdfDoc: PDFDocument) {
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fecha = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const hora = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      page.drawLine({
        start: { x: 50, y: 30 },
        end: { x: width - 50, y: 30 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });

      page.drawText(`Página ${i + 1} de ${pages.length}`, {
        x: width - 100,
        y: 15,
        size: 9,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });

      page.drawText(`Generado: ${fecha} ${hora}`, {
        x: 50,
        y: 15,
        size: 9,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  private async insertChart(
    pdfDoc: PDFDocument,
    page: PDFPage,
    chartBase64: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    try {
      const base64Data = chartBase64.replace(
        /^data:image\/(png|jpg|jpeg|gif);base64,/,
        '',
      );

      const chartImage = await pdfDoc.embedPng(
        Buffer.from(base64Data, 'base64'),
      );

      page.drawImage(chartImage, {
        x,
        y: y - height,
        width,
        height,
      });
    } catch (error) {
      console.error('Error al insertar gráfico:', error);
    }
  }

  private async createUserComparisonPage(
    pdfDoc: PDFDocument,
    data: ReportData,
  ) {
    if (!data.users) return;

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('COMPARACIÓN DE USUARIOS', {
      x: 50,
      y: height - 60,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });

    page.drawLine({
      start: { x: 50, y: height - 75 },
      end: { x: width - 50, y: height - 75 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    if (data.charts?.userComparisonBase64) {
      await this.insertChart(
        pdfDoc,
        page,
        data.charts.userComparisonBase64,
        50,
        height - 100,
        width - 100,
        200,
      );
    }

    const headers = [
      'Usuario',
      'Videos',
      'Vistas',
      'Me gusta',
      'Coment.',
      'Comp.',
      'Engage. %',
    ];

    const tableY = height - 320;
    const tableWidth = width - 100;
    const colWidths = [
      Math.round(tableWidth * 0.25), // Usuario
      Math.round(tableWidth * 0.1), // Videos
      Math.round(tableWidth * 0.15), // Vistas
      Math.round(tableWidth * 0.15), // Me gusta
      Math.round(tableWidth * 0.125), // Comentarios
      Math.round(tableWidth * 0.125), // Compartidos
      Math.round(tableWidth * 0.1), // Engagement
    ];

    let xPos = 50;
    page.drawRectangle({
      x: 50,
      y: tableY - 5,
      width: tableWidth,
      height: 25,
      color: rgb(0.95, 0.95, 0.98),
    });

    headers.forEach((header, i) => {
      page.drawText(header, {
        x: xPos + 5,
        y: tableY + 10,
        size: 11,
        font,
      });
      xPos += colWidths[i];
    });

    let yPos = tableY - 30;
    data.users.forEach((user, idx) => {
      xPos = 50;

      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 50,
          y: yPos - 5,
          width: tableWidth,
          height: 25,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      const rowData = [
        this.sanitizeText(user.username),
        user.videoCount.toString(),
        user.totalViews.toLocaleString('es-ES'),
        user.totalLikes.toLocaleString('es-ES'),
        user.totalComments.toLocaleString('es-ES'),
        user.totalShares.toLocaleString('es-ES'),
        `${user.averageEngagement.toFixed(2)}%`,
      ];

      rowData.forEach((text, i) => {
        page.drawText(text, {
          x: xPos + 5,
          y: yPos + 5,
          size: 10,
          font: regularFont,
          maxWidth: colWidths[i] - 10,
        });
        xPos += colWidths[i];
      });

      yPos -= 30;
    });
  }

  private sanitizeText(text: string): string {
    if (!text) return '';

    // Eliminar emojis y caracteres especiales que no son compatibles con WinAnsi
    return text
      .replace(/[\u{1F300}-\u{1F6FF}]/gu, '') // Eliminar emojis
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Más emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos diversos
      .replace(/[^\x20-\x7E\xA1-\xFF]/g, '') // Solo permitir caracteres ASCII y Latin-1
      .trim();
  }
}
