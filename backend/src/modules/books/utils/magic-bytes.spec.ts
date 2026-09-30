import {
  detectImageKind,
  extensionForKind,
} from './magic-bytes';

function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]);
}

function webpBuffer(): Buffer {
  const buf = Buffer.alloc(12);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(4, 4);
  buf.write('WEBP', 8, 'ascii');
  return buf;
}

describe('detectImageKind (magic bytes)', () => {
  it('acepta JPEG', () => {
    expect(detectImageKind(jpegBuffer())).toBe('jpeg');
    expect(extensionForKind('jpeg')).toBe('jpg');
  });

  it('acepta PNG', () => {
    expect(detectImageKind(pngBuffer())).toBe('png');
    expect(extensionForKind('png')).toBe('png');
  });

  it('acepta WebP', () => {
    expect(detectImageKind(webpBuffer())).toBe('webp');
    expect(extensionForKind('webp')).toBe('webp');
  });

  it('rechaza texto plano', () => {
    expect(detectImageKind(Buffer.from('hello world'))).toBeNull();
  });

  it('rechaza PDF', () => {
    expect(detectImageKind(Buffer.from('%PDF-1.4 fake'))).toBeNull();
  });

  it('rechaza buffer vacío o demasiado corto', () => {
    expect(detectImageKind(Buffer.alloc(0))).toBeNull();
    expect(detectImageKind(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
