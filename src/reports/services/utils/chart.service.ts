import { Injectable } from '@nestjs/common';
import { createCanvas } from 'canvas';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import {
  ReportDataMedia,
  UserMetrics,
} from '../../interfaces/report-data.interfaces';

Chart.register(...registerables);

@Injectable()
export class ChartService {
  private readonly CHART_WIDTH = 800;
  private readonly CHART_HEIGHT = 500;
  private readonly CHART_SCALE = 2;

  async generateViewsChart(media: ReportDataMedia[]): Promise<string> {
    const topMedia = [...media].sort((a, b) => b.views - a.views).slice(0, 7);

    const width = this.CHART_WIDTH * this.CHART_SCALE;
    const height = this.CHART_HEIGHT * this.CHART_SCALE;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.scale(this.CHART_SCALE, this.CHART_SCALE);

    const labels = topMedia.map((item) => this.truncateTitle(item.title, 15));
    const data = topMedia.map((item) => item.views);

    const backgroundColors = this.generateGradientColors(7, 'blue');
    const borderColors = this.generateSolidColors(7, 'blue');

    const isInstagram = topMedia.length > 0 && 'mediaType' in topMedia[0];

    const chartTitle = isInstagram
      ? 'Publicaciones con Mayor Alcance'
      : 'Videos con Más Vistas';

    const yAxisTitle = isInstagram ? 'Alcance' : 'Vistas';

    new Chart(
      canvas as any,
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: isInstagram ? 'Alcance' : 'Vistas',
              data,
              backgroundColor: this.generateGradientColors(7, 'blue'),
              borderColor: this.generateSolidColors(7, 'blue'),
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          devicePixelRatio: this.CHART_SCALE,
          plugins: {
            title: {
              display: true,
              text: chartTitle,
              font: { size: 22, weight: 'bold' },
              color: '#000000',
              padding: 20,
            },
            legend: {
              display: false,
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 16 },
              callbacks: {
                label: function (context) {
                  return `${isInstagram ? 'Alcance' : 'Vistas'}: ${(
                    context.raw as number
                  ).toLocaleString('es-ES')}`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: yAxisTitle,
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
              ticks: {
                font: { size: 14 },
                color: '#333333',
                callback: function (value) {
                  return (value as number).toLocaleString('es-ES');
                },
              },
              grid: {
                color: '#e0e0e0',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Videos',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 14,
                  weight: 'bold',
                },
                color: '#333333',
              },
            },
          },
        },
      } as ChartConfiguration,
    );

    return canvas.toDataURL('image/png');
  }

  async generateEngagementChart(videos: ReportDataMedia[]): Promise<string> {
    const selectedVideos = [...videos].slice(0, 7);

    const width = this.CHART_WIDTH * this.CHART_SCALE;
    const height = this.CHART_HEIGHT * this.CHART_SCALE;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.scale(this.CHART_SCALE, this.CHART_SCALE);

    const labels = selectedVideos.map((video) =>
      this.truncateTitle(video.title, 12),
    );
    const data = selectedVideos.map((video) => video.engagementRate);

    new Chart(
      canvas as any,
      {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Engagement %',
              data,
              fill: {
                target: 'origin',
                above: 'rgba(255, 99, 132, 0.2)',
              },
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 3,
              tension: 0.3,
              pointBackgroundColor: 'rgba(255, 99, 132, 1)',
              pointRadius: 7,
              pointHoverRadius: 9,
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          devicePixelRatio: this.CHART_SCALE,
          plugins: {
            title: {
              display: true,
              text: 'Engagement por Video',
              font: { size: 22, weight: 'bold' },
              color: '#000000',
              padding: 20,
            },
            legend: {
              labels: {
                font: { size: 16 },
                color: '#333333',
              },
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 16 },
              callbacks: {
                label: function (context) {
                  return `Engagement: ${(context.raw as number).toFixed(2)}%`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Tasa de Engagement (%)',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
              ticks: {
                font: { size: 14 },
                color: '#333333',
                callback: function (value) {
                  return value + '%';
                },
              },
              grid: {
                color: '#e0e0e0',
              },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 14,
                  weight: 'bold',
                },
                color: '#333333',
              },
              title: {
                display: true,
                text: 'Videos',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
            },
          },
        },
      } as ChartConfiguration,
    );

    return canvas.toDataURL('image/png');
  }

  async generateLikesComparisonChart(
    videos: ReportDataMedia[],
  ): Promise<string> {
    const topVideos = [...videos].sort((a, b) => b.likes - a.likes).slice(0, 5);

    const width = this.CHART_WIDTH * this.CHART_SCALE;
    const height = this.CHART_HEIGHT * this.CHART_SCALE;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.scale(this.CHART_SCALE, this.CHART_SCALE);

    const labels = topVideos.map((video) =>
      this.truncateTitle(video.title, 10),
    );

    new Chart(
      canvas as any,
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Me gusta',
              data: topVideos.map((video) => video.likes),
              backgroundColor: 'rgba(255, 99, 132, 0.8)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
            },
            {
              label: 'Comentarios',
              data: topVideos.map((video) => video.comments),
              backgroundColor: 'rgba(54, 162, 235, 0.8)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
            },
            {
              label: 'Compartidos',
              data: topVideos.map((video) => video.shares),
              backgroundColor: 'rgba(255, 206, 86, 0.8)',
              borderColor: 'rgba(255, 206, 86, 1)',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          devicePixelRatio: this.CHART_SCALE,
          plugins: {
            title: {
              display: true,
              text: 'Interacciones por Video',
              font: { size: 22, weight: 'bold' },
              color: '#000000',
              padding: 20,
            },
            legend: {
              position: 'top',
              labels: {
                font: {
                  size: 16,
                  weight: 'bold',
                },
                color: '#333333',
                padding: 20,
              },
              title: {
                display: true,
                text: 'Tipos de interacción',
                font: { size: 16 },
              },
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 16 },
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += (context.raw as number).toLocaleString('es-ES');
                  return label;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Cantidad',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
              ticks: {
                font: { size: 14 },
                color: '#333333',
                callback: function (value) {
                  return (value as number).toLocaleString('es-ES');
                },
              },
              grid: {
                color: '#e0e0e0',
              },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 14,
                  weight: 'bold',
                },
                color: '#333333',
              },
              title: {
                display: true,
                text: 'Videos',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
            },
          },
        },
      } as ChartConfiguration,
    );

    return canvas.toDataURL('image/png');
  }

  async generateEngagementComparisonChart(
    videos: ReportDataMedia[],
  ): Promise<string> {
    const selectedVideos = [...videos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const width = this.CHART_WIDTH * this.CHART_SCALE;
    const height = this.CHART_HEIGHT * this.CHART_SCALE;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.scale(this.CHART_SCALE, this.CHART_SCALE);

    const labels = selectedVideos.map((video) =>
      this.truncateTitle(video.title, 10),
    );

    if (labels.length === 0) {
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'No hay suficientes datos para generar esta gráfica',
        this.CHART_WIDTH / 2,
        this.CHART_HEIGHT / 2,
      );
      return canvas.toDataURL('image/png');
    }

    new Chart(
      canvas as any,
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Vistas (miles)',
              data: selectedVideos.map((video) => video.views / 1000),
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              yAxisID: 'y',
            },
            {
              label: 'Engagement (%)',
              data: selectedVideos.map((video) => video.engagementRate),
              backgroundColor: 'rgba(153, 102, 255, 0.8)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 2,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          devicePixelRatio: this.CHART_SCALE,
          plugins: {
            title: {
              display: true,
              text: 'Relación entre Vistas y Engagement',
              font: { size: 22, weight: 'bold' },
              color: '#000000',
              padding: 20,
            },
            legend: {
              position: 'top',
              labels: {
                font: { size: 16, weight: 'bold' },
                color: '#333333',
                padding: 20,
              },
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 16 },
              callbacks: {
                label: function (context) {
                  const label = context.dataset.label || '';
                  const value = context.raw as number;
                  if (label.includes('Vistas')) {
                    return `${label}: ${value.toLocaleString('es-ES')}K`;
                  } else {
                    return `${label}: ${value.toFixed(2)}%`;
                  }
                },
              },
            },
          },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              title: {
                display: true,
                text: 'Vistas (miles)',
                font: { size: 16, weight: 'bold' },
                color: 'rgba(75, 192, 192, 1)',
              },
              ticks: {
                color: 'rgba(75, 192, 192, 1)',
                font: { size: 14 },
              },
              grid: {
                color: '#e0e0e0',
              },
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: {
                display: true,
                text: 'Engagement (%)',
                font: { size: 16, weight: 'bold' },
                color: 'rgba(153, 102, 255, 1)',
              },
              ticks: {
                color: 'rgba(153, 102, 255, 1)',
                font: { size: 14 },
                callback: function (value) {
                  return value + '%';
                },
              },
              grid: {
                drawOnChartArea: false,
              },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 14,
                  weight: 'bold',
                },
                color: '#333333',
              },
              title: {
                display: true,
                text: 'Videos',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
            },
          },
        },
      } as ChartConfiguration,
    );

    return canvas.toDataURL('image/png');
  }

  private truncateTitle(title: string, maxLength: number): string {
    return title.length > maxLength
      ? `${title.substring(0, maxLength)}...`
      : title;
  }

  private generateGradientColors(count: number, baseColor: string): string[] {
    const colors = [];
    const opacity = 0.8;

    if (baseColor === 'blue') {
      for (let i = 0; i < count; i++) {
        const hue = 210 + ((i * 10) % 40);
        colors.push(`hsla(${hue}, 80%, 60%, ${opacity})`);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const hue = (i * 30) % 360;
        colors.push(`hsla(${hue}, 80%, 60%, ${opacity})`);
      }
    }

    return colors;
  }

  private generateSolidColors(count: number, baseColor: string): string[] {
    const colors = [];

    if (baseColor === 'blue') {
      for (let i = 0; i < count; i++) {
        const hue = 210 + ((i * 10) % 40);
        colors.push(`hsl(${hue}, 80%, 45%)`);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const hue = (i * 30) % 360;
        colors.push(`hsl(${hue}, 80%, 45%)`);
      }
    }

    return colors;
  }

  async generateUserComparisonChart(
    userMetrics: UserMetrics[],
  ): Promise<string> {
    const width = this.CHART_WIDTH * this.CHART_SCALE;
    const height = this.CHART_HEIGHT * this.CHART_SCALE;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.scale(this.CHART_SCALE, this.CHART_SCALE);

    const labels = userMetrics.map((user) => user.username);
    const viewsData = userMetrics.map((user) => user.totalViews / 1000);
    const engagementData = userMetrics.map((user) => user.averageEngagement);

    new Chart(
      canvas as any,
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Vistas Totales (miles)',
              data: viewsData,
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              yAxisID: 'y',
            },
            {
              label: 'Engagement Promedio (%)',
              data: engagementData,
              backgroundColor: 'rgba(153, 102, 255, 0.8)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 2,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          devicePixelRatio: this.CHART_SCALE,
          plugins: {
            title: {
              display: true,
              text: 'Comparación de Rendimiento por Usuario',
              font: { size: 22, weight: 'bold' },
              color: '#000000',
              padding: 20,
            },
            legend: {
              position: 'top',
              labels: {
                font: { size: 16, weight: 'bold' },
                color: '#333333',
                padding: 20,
              },
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 16 },
              callbacks: {
                label: function (context) {
                  const label = context.dataset.label || '';
                  const value = context.raw as number;
                  if (label.includes('Vistas')) {
                    return `${label}: ${value.toLocaleString('es-ES')}K`;
                  } else {
                    return `${label}: ${value.toFixed(2)}%`;
                  }
                },
              },
            },
          },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              title: {
                display: true,
                text: 'Vistas Totales (miles)',
                font: { size: 16, weight: 'bold' },
                color: 'rgba(75, 192, 192, 1)',
              },
              ticks: {
                color: 'rgba(75, 192, 192, 1)',
                font: { size: 14 },
              },
              grid: {
                color: '#e0e0e0',
              },
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: {
                display: true,
                text: 'Engagement Promedio (%)',
                font: { size: 16, weight: 'bold' },
                color: 'rgba(153, 102, 255, 1)',
              },
              ticks: {
                color: 'rgba(153, 102, 255, 1)',
                font: { size: 14 },
                callback: function (value) {
                  return value + '%';
                },
              },
              grid: {
                drawOnChartArea: false,
              },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 14,
                  weight: 'bold',
                },
                color: '#333333',
              },
              title: {
                display: true,
                text: 'Usuarios',
                font: { size: 16, weight: 'bold' },
                color: '#333333',
              },
            },
          },
        },
      } as ChartConfiguration,
    );

    return canvas.toDataURL('image/png');
  }
}
