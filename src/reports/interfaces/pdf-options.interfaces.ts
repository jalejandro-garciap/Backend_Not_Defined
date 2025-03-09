export interface PdfOptions {
    pageSize: {
      width: number;
      height: number;
    };
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    orientation: 'portrait' | 'landscape';
    footer?: {
      height: number;
      contents: string;
    };
  }