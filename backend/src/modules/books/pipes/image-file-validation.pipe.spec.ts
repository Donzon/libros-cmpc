import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageFileValidationPipe } from './image-file-validation.pipe';

function jpegFile(size?: number): Express.Multer.File {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: size ?? buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as unknown as Express.Multer.File['stream'],
  };
}

describe('ImageFileValidationPipe', () => {
  let pipe: ImageFileValidationPipe;
  const maxBytes = 100;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ImageFileValidationPipe,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MAX_IMAGE_BYTES') {
                return maxBytes;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    pipe = moduleRef.get(ImageFileValidationPipe);
  });

  it('acepta JPEG válido', () => {
    const result = pipe.transform(jpegFile());
    expect(result.kind).toBe('jpeg');
    expect(result.extension).toBe('jpg');
  });

  it('rechaza archivo ausente', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('rechaza oversize', () => {
    const file = jpegFile(maxBytes + 1);
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
    expect(() => pipe.transform(file)).toThrow(/maximum size/);
  });

  it('rechaza PDF por magic bytes', () => {
    const buffer = Buffer.from('%PDF-1.4');
    const file = {
      ...jpegFile(),
      buffer,
      size: buffer.length,
      mimetype: 'application/pdf',
      originalname: 'doc.pdf',
    };
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
    expect(() => pipe.transform(file)).toThrow(/JPEG, PNG or WebP/);
  });
});
