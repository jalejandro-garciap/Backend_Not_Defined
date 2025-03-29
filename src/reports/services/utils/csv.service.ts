import { Injectable } from '@nestjs/common';
import {
  IReportGenerator,
  ReportData,
} from '../../interfaces/report-data.interfaces';

@Injectable()
export class CsvService implements IReportGenerator {
  async generateReport(data: ReportData): Promise<Buffer> {
    const headers = [
      'Titulo',
      'Vistas',
      'Me gusta',
      'Comentarios',
      'Compartidos',
      'Duracion (s)',
      'Fecha de creacion',
      'Engagement (%)',
      'URL',
    ];

    const rows = [headers.join(',')];

    data.videos.forEach((video) => {
      const fechaFormateada = video.createdAt.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const titleEscaped = video.title.replace(/"/g, '""');

      const row = [
        `"${titleEscaped}"`,
        video.views,
        video.likes,
        video.comments,
        video.shares,
        video.duration,
        fechaFormateada,
        video.engagementRate.toFixed(2),
        video.shareUrl,
      ];

      rows.push(row.join(','));
    });

    rows.push('');
    rows.push('Datos resumidos,,,,,,,,,');
    rows.push(`Total de vistas,${data.metrics.totalViews},,,,,,,`);
    rows.push(`Total de me gusta,${data.metrics.totalLikes},,,,,,,`);
    rows.push(`Total de comentarios,${data.metrics.totalComments},,,,,,,`);
    rows.push(`Total de compartidos,${data.metrics.totalShares},,,,,,,`);
    rows.push(`Duracion total (s),${data.metrics.totalDuration},,,,,,,`);
    rows.push(
      `Engagement promedio (%),${data.metrics.averageEngagementRate.toFixed(2)},,,,,,,`,
    );

    const csvContent = rows.join('\r\n');
    return Buffer.from(csvContent);
  }

  async generateMultiUserReport(data: ReportData): Promise<Buffer> {
    const headers = data.isInstagram
      ? [
          'Usuario',
          'Descripción',
          'Alcance',
          'Me gusta',
          'Comentarios',
          'Guardados',
          'Compartidos',
          'Engagement (%)',
          'Fecha',
          'URL',
        ]
      : [
          'Usuario',
          'Titulo',
          'Vistas',
          'Me gusta',
          'Comentarios',
          'Compartidos',
          'Duracion (s)',
          'Fecha de creacion',
          'Engagement (%)',
          'URL',
        ];

    const rows = [headers.join(',')];

    data.videos.forEach((item) => {
      const fechaFormateada = item.createdAt.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const titleEscaped = item.title.replace(/"/g, '""');
      const usernameEscaped = (item.username || 'Unknown').replace(/"/g, '""');

      const row = data.isInstagram
        ? [
            `"${usernameEscaped}"`,
            `"${titleEscaped}"`,
            item.views,
            item.likes,
            item.comments,
            item.saved || 0,
            item.shares || 0,
            item.engagementRate.toFixed(2),
            fechaFormateada,
            item.shareUrl,
          ]
        : [
            `"${usernameEscaped}"`,
            `"${titleEscaped}"`,
            item.views,
            item.likes,
            item.comments,
            item.shares,
            item.duration || 0,
            fechaFormateada,
            item.engagementRate.toFixed(2),
            item.shareUrl,
          ];

      rows.push(row.join(','));
    });

    rows.push('');
    rows.push('RESUMEN GENERAL,,,,,,,,,,');

    if (data.isInstagram) {
      rows.push(`Total de alcance,${data.metrics.totalViews},,,,,,,,`);
      rows.push(`Total de me gusta,${data.metrics.totalLikes},,,,,,,,`);
      rows.push(`Total de comentarios,${data.metrics.totalComments},,,,,,,,`);
      rows.push(`Total de guardados,${data.metrics.totalSaved || 0},,,,,,,,`);
      rows.push(`Total de compartidos,${data.metrics.totalShares},,,,,,,,`);
    } else {
      rows.push(`Total de vistas,${data.metrics.totalViews},,,,,,,,`);
      rows.push(`Total de me gusta,${data.metrics.totalLikes},,,,,,,,`);
      rows.push(`Total de comentarios,${data.metrics.totalComments},,,,,,,,`);
      rows.push(`Total de compartidos,${data.metrics.totalShares},,,,,,,,`);
      rows.push(
        `Duración total (s),${data.metrics.totalDuration || 0},,,,,,,,`,
      );
    }

    rows.push(
      `Engagement promedio (%),${data.metrics.averageEngagementRate.toFixed(2)},,,,,,,,`,
    );

    if (data.users && data.users.length > 0) {
      rows.push('');
      rows.push('RESUMEN POR USUARIO,,,,,,,,,,');

      if (data.isInstagram) {
        rows.push(
          'Usuario,Publicaciones,Alcance,Me gusta,Comentarios,Guardados,Compartidos,Engagement (%),,',
        );
      } else {
        rows.push(
          'Usuario,Videos,Vistas,Me gusta,Comentarios,Compartidos,Engagement (%),,,,',
        );
      }

      data.users.forEach((user) => {
        if (data.isInstagram) {
          rows.push(
            `"${user.username}",${user.videoCount},${user.totalViews},${user.totalLikes},` +
              `${user.totalComments},${user.totalSaved || 0},${user.totalShares},${user.averageEngagement.toFixed(2)},,`,
          );
        } else {
          rows.push(
            `"${user.username}",${user.videoCount},${user.totalViews},${user.totalLikes},` +
              `${user.totalComments},${user.totalShares},${user.averageEngagement.toFixed(2)},,,,`,
          );
        }
      });
    }

    const csvContent = rows.join('\r\n');
    return Buffer.from(csvContent);
  }
}
