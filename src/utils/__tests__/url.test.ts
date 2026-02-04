import { describe, it, expect } from 'vitest';
import { stripUrlQuery, extractUrlFileName } from '@/utils/url';

describe('url utils', () => {
  it('stripUrlQuery removes querystring', () => {
    expect(stripUrlQuery('https://x/y.jpg?v=123')).toBe('https://x/y.jpg');
    expect(stripUrlQuery('https://x/y.jpg')).toBe('https://x/y.jpg');
  });

  it('extractUrlFileName returns last path segment without query', () => {
    expect(extractUrlFileName('https://a/b/c.png?v=1')).toBe('c.png');
    expect(extractUrlFileName('https://a/b/c.png')).toBe('c.png');
  });

  it('extractUrlFileName supports non-URL strings', () => {
    expect(extractUrlFileName('https://a/b/c.png?v=1#hash')).toBe('c.png');
    expect(extractUrlFileName('/storage/v1/object/public/personnel-photos/uuid_1.jpg?v=2')).toBe('uuid_1.jpg');
  });
});
