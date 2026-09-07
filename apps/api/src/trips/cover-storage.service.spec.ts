import { jest } from '@jest/globals';
import { CoverStorageService } from './cover-storage.service.js';

describe('Supabase Storage adapter', () => {
  const service = new CoverStorageService();
  const original = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_TRIP_COVERS_BUCKET,
  };
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://storage.example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
    process.env.SUPABASE_TRIP_COVERS_BUCKET = 'trip-covers';
    fetchMock.mockReset();
  });
  afterAll(() => {
    fetchMock.mockRestore();
    for (const [name, value] of Object.entries({
      SUPABASE_URL: original.url,
      SUPABASE_SERVICE_ROLE_KEY: original.key,
      SUPABASE_TRIP_COVERS_BUCKET: original.bucket,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  it('checks existence and generates a temporary URL with a server credential', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    fetchMock.mockResolvedValueOnce(
      Response.json({
        signedURL: '/object/sign/trip-covers/cover.png?token=test',
      }),
    );
    const result = await service.signedUrl('cover.png');
    expect(result).toContain('/object/sign/trip-covers/cover.png?token=test');
    const [, options] = fetchMock.mock.calls[1];
    expect(JSON.parse(options!.body as string)).toEqual({ expiresIn: 900 });
    expect(new Headers(options!.headers).get('Authorization')).toBe(
      'Bearer test-only-key',
    );
  });
  it('returns null for a missing object without signing it', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await service.signedUrl('missing.png')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('returns null when signing fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Unavailable' }, { status: 503 }),
    );
    expect(await service.signedUrl('cover.png')).toBeNull();
  });
  it('returns null when configuration is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await service.signedUrl('cover.png')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a public bucket before uploading', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 'trip-covers', public: true }),
    );
    await expect(
      service.upload('cover.png', {
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
        size: 4,
      }),
    ).rejects.toThrow('bucket privé');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('uploads without overwriting and preserves MIME', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 'trip-covers', public: false }),
    );
    fetchMock.mockResolvedValueOnce(
      Response.json({ Key: 'trip-covers/cover.png', Id: 'object' }),
    );
    await service.upload('cover.png', {
      buffer: Buffer.from('test'),
      mimetype: 'image/png',
      size: 4,
    });
    const headers = new Headers(fetchMock.mock.calls[1][1]!.headers);
    expect(headers.get('x-upsert')).toBe('false');
    expect(headers.get('content-type')).toBe('image/png');
  });
  it('retries failed cleanup and reports a persistent failure', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Unavailable' }, { status: 503 }),
    );
    expect(await service.cleanup('cover.png')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
