import { test, expect } from '@playwright/test';

/**
 * These tests hit the Next.js BFF proxy routes directly (no browser UI),
 * useful for fast backend/contract verification. Reuses the same
 * storageState so the JWT cookie/header set up in auth.setup.ts is sent.
 */
test.describe('Events API (BFF proxy)', () => {
  test('GET /api/events returns paginated ApiResponse shape', async ({ request }) => {
    const response = await request.get('/api/events?page=1&limit=10');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('POST /api/events validates required fields', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: { event_name: '' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('errors');
  });

  test('POST then DELETE /api/events full lifecycle', async ({ request }) => {
    const createRes = await request.post('/api/events', {
      data: {
        event_name: `Lifecycle Test ${Date.now()}`,
        event_date: '2026-12-15',
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const eventId = created.data.id;

    const deleteRes = await request.delete(`/api/events/${eventId}`);
    expect(deleteRes.status()).toBe(200);

    const getRes = await request.get(`/api/events/${eventId}`);
    expect(getRes.status()).toBe(404);
  });
});
