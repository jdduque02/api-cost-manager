/**
 * Declaración mínima de `pdfjs-dist` (v1.10.100) para extracción de texto
 * en Node.js. La librería no publica tipos propios para esta versión.
 */
declare module 'pdfjs-dist/build/pdf.js' {
  export interface PDFTextItem {
    str: string;
    width?: number;
    height?: number;
    transform: number[];
  }

  export interface PDFTextContent {
    items: PDFTextItem[];
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): void;
  }

  export interface GetDocumentParams {
    data: Uint8Array;
    password?: string;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export class PasswordException extends Error {}

  export const version: string;
  export const disableWorker: boolean;

  export function getDocument(
    params: GetDocumentParams,
  ): PDFDocumentLoadingTask;
}
