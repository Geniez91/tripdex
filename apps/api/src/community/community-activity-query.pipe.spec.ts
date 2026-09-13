import { CommunityActivityQueryPipe } from './community-activity-query.pipe.js';

describe('Community activity cursor', () => {
  it.each(['trip:one', 'contest:one'])('preserves a typed cursor %s and timestamp precision', id => {
    // Arrange
    const cursor = { id, createdAt: '2042-01-01 00:00:00.123456+00' };
    const encoded = Buffer.from(JSON.stringify(cursor)).toString('base64url');
    // Act
    const result = new CommunityActivityQueryPipe().transform({ limit: '2', cursor: encoded });
    // Assert
    expect(result.cursor).toEqual(cursor);
  });
  it('accepts a previous trip cursor but rejects an empty identifier', () => {
    // Arrange
    const encode = (id: string) => Buffer.from(JSON.stringify({ id, createdAt: '2042-01-01T00:00:00.000Z' })).toString('base64url');
    const pipe = new CommunityActivityQueryPipe();
    // Act / Assert
    expect(pipe.transform({ cursor: encode('old-trip') }).cursor?.id).toBe('trip:old-trip');
    expect(() => pipe.transform({ cursor: encode('') })).toThrow();
  });
});
