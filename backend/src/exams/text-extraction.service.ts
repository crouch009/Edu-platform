import { Injectable, BadRequestException } from '@nestjs/common';

const SUPPORTED_TYPES: Record<string, string> = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

@Injectable()
export class TextExtractionService {
  async extractText(file: Express.Multer.File): Promise<string> {
    const kind = SUPPORTED_TYPES[file.mimetype];
    if (!kind) {
      throw new BadRequestException(
        'صيغة الملف غير مدعومة. الصيغ المدعومة: TXT, PDF, DOC, DOCX',
      );
    }

    if (kind === 'txt') {
      return file.buffer.toString('utf-8');
    }

    if (kind === 'pdf') {
      const pdfParse = await import('pdf-parse');
      const result = await pdfParse.default(file.buffer);
      return result.text;
    }

    if (kind === 'docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }

    // Legacy .doc (binary format) isn't reliably parseable without extra
    // native tooling - ask the person to save as .docx or .pdf instead.
    throw new BadRequestException(
      'صيغة .doc القديمة غير مدعومة، من فضلك احفظ الملف كـ .docx أو .pdf',
    );
  }
}
