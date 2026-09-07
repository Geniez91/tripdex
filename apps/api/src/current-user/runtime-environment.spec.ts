import { execFileSync } from 'node:child_process';

describe('startup environment', () => {
  it.each(['production', 'development'])(
    'sets %s before application imports regardless of the inherited environment',
    (environment) => {
      const preload = new URL(
        `../../scripts/${environment}.mjs`,
        import.meta.url,
      ).href;
      const result = execFileSync(
        process.execPath,
        [
          '--import',
          preload,
          '--eval',
          'process.stdout.write(process.env.NODE_ENV)',
        ],
        {
          env: { ...process.env, NODE_ENV: 'test', DEV_AUTH_ENABLED: 'true' },
          encoding: 'utf8',
          windowsHide: true,
        },
      );
      expect(result).toBe(environment);
    },
  );
});
