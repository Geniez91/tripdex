import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StorageClient } from '@supabase/storage-js';
import { LOGGER_CONTEXT } from '../logger.constants.js';
import type { ICoverFile } from './types/cover-format.js';

export const COVER_URL_TTL = 15 * 60;

@Injectable()
export class CoverStorageService {
  private readonly logger = new Logger(LOGGER_CONTEXT.COVER_STORAGE_SERVICE);

  private storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_TRIP_COVERS_BUCKET || 'trip-covers';
    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Le stockage des covers n’est pas configuré.',
      );
    }
    const client = new StorageClient(
      `${url.replace(/\/$/, '')}/storage/v1`,
      {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    );
    return { client, bucket, files: client.from(bucket) };
  }

  async checkConfiguration(): Promise<{
    bucket: string;
    private: true;
    fileSizeLimit: number | null;
    allowedMimeTypes: readonly string[] | null;
  }> {
    const { client, bucket } = this.storage();
    const metadata = await client.getBucket(bucket);
    if (metadata.error || !metadata.data || metadata.data.public !== false) {
      throw new ServiceUnavailableException(
        'Le bucket privé des covers est indisponible.',
      );
    }
    return {
      bucket,
      private: true,
      fileSizeLimit: metadata.data.file_size_limit ?? null,
      allowedMimeTypes: metadata.data.allowed_mime_types ?? null,
    };
  }

  async upload(path: string, file: ICoverFile): Promise<void> {
    await this.checkConfiguration();
    const { files } = this.storage();
    const { error } = await files.upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
      cacheControl: '900',
    });
    if (error)
      throw new ServiceUnavailableException('L’envoi de la cover a échoué.');
  }

  async signedUrl(path: string): Promise<string | null> {
    try {
      const { files } = this.storage();
      const exists = await files.exists(path);
      if (exists.error || !exists.data) return null;
      const { data, error } = await files.createSignedUrl(path, COVER_URL_TTL);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      this.logger.warn('Cover signing unavailable.');
      return null;
    }
  }

  // Best effort compensation. Never log storage paths, keys, or signed URLs.
  async cleanup(path: string): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await this.storage().files.remove([path]);
        if (!error) return true;
      } catch {
        /* Retry transient Storage failures. */
      }
    }
    this.logger.error('Cover cleanup required.');
    return false;
  }
}
