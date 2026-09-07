import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { CoverFormat } from './types/cover-format.js';

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const COVER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface CoverFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export function validateCover(file: CoverFile | undefined): CoverFormat {
  if (!file || !file.buffer.length) {
    throw new BadRequestException('Sélectionnez une image.');
  }
  if (file.size > MAX_COVER_BYTES || file.buffer.length > MAX_COVER_BYTES) {
    throw new PayloadTooLargeException('La cover doit faire au maximum 5 Mio.');
  }
  const bytes = file.buffer;
  const extension: CoverFormat | null = bytes
    .subarray(0, 3)
    .equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? CoverFormat.Jpeg
    : bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      ? CoverFormat.Png
      : bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
        ? CoverFormat.Webp
        : null;
  const mime: Record<CoverFormat, (typeof COVER_MIME_TYPES)[number]> = {
    [CoverFormat.Jpeg]: 'image/jpeg',
    [CoverFormat.Png]: 'image/png',
    [CoverFormat.Webp]: 'image/webp',
  };
  if (!extension || mime[extension] !== file.mimetype) {
    throw new BadRequestException(
      'Utilisez une image JPEG, PNG ou WebP valide.',
    );
  }
  return extension;
}

export function coverPrefix(userId: string, tripId: string): string {
  if (![userId, tripId].every((id) => /^[A-Za-z0-9_-]{1,128}$/.test(id))) {
    throw new BadRequestException('Identifiant de voyage invalide.');
  }
  return `users/${userId}/trips/${tripId}/cover/`;
}

export function ownsCoverPath(
  userId: string,
  tripId: string,
  path: string,
): boolean {
  const prefix = coverPrefix(userId, tripId);
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path.slice(prefix.length))
  );
}
