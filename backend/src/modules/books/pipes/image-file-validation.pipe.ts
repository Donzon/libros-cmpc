import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../../config/env.schema';
import {
  detectImageKind,
  extensionForKind,
  ImageKind,
} from '../utils/magic-bytes';

export type ValidatedImageFile = {
  buffer: Buffer;
  extension: string;
  kind: ImageKind;
  size: number;
};

@Injectable()
export class ImageFileValidationPipe implements PipeTransform {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  transform(file?: Express.Multer.File): ValidatedImageFile {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('file is required');
    }

    const maxBytes = this.config.get('MAX_IMAGE_BYTES', { infer: true });
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `file exceeds maximum size of ${maxBytes} bytes`,
      );
    }

    const kind = detectImageKind(file.buffer);
    if (kind === null) {
      throw new BadRequestException(
        'file must be a JPEG, PNG or WebP image',
      );
    }

    return {
      buffer: file.buffer,
      extension: extensionForKind(kind),
      kind,
      size: file.size,
    };
  }
}
