import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionActions } from '@/components/subscriptions/SubscriptionActions';

describe('SubscriptionActions (Enterprise)', () => {
  it('remove upgrade e oferece downgrade quando plano é Enterprise', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SubscriptionActions subscription={{ subscription_plans: { name: 'enterprise' } }} />
        </MemoryRouter>
      );
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(document.body.innerHTML).toContain('Fazer Downgrade do Plano');
    expect(document.body.innerHTML).toContain('Você já está no melhor plano disponível.');
    expect(document.body.innerHTML).not.toContain('Fazer Upgrade do Plano');

    await act(async () => {
      root.unmount();
    });
  });

  it('mantém upgrade quando plano não é Enterprise', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SubscriptionActions subscription={{ subscription_plans: { name: 'pro' } }} />
        </MemoryRouter>
      );
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(document.body.innerHTML).toContain('Fazer Upgrade do Plano');
    expect(document.body.innerHTML).not.toContain('Fazer Downgrade do Plano');

    await act(async () => {
      root.unmount();
    });
  });
});

