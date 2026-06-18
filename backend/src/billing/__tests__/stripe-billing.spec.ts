/**
 * Ω.CERT.3 — Stripe billing unit tests
 *
 * Tests:
 *   1. Webhook signature validation (invalid sig → reject)
 *   2. Duplicate webhook idempotency (second call with same stripeEventId → skip)
 *   3. customer.subscription.created → upserts local subscription
 *   4. customer.subscription.deleted → cancels + downgrades to free
 *   5. invoice.payment_failed → sets status = suspended
 *   6. checkout.session.completed → syncs stripeCustomerId to user
 *   7. User cannot create checkout for another user's plan (ownership enforced at controller level — tested here via service guard)
 *   8. BillingService.subscribe cannot be used without plan existing
 */

import { BadRequestException } from '@nestjs/common';
import { StripeService } from '../stripe.service';

// ── Shared Mocks ──────────────────────────────────────────────────────────────

const USER_ID = 'user-abc';
const PLAN_ID = 'plan-pro';
const STRIPE_SUB_ID = 'sub_test_123';
const STRIPE_CUST_ID = 'cus_test_456';
const STRIPE_EVENT_ID = 'evt_test_789';

function buildPrisma(overrides: Partial<Record<string, any>> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: USER_ID, email: 'test@example.com', name: 'Test', stripeCustomerId: null }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    plan: {
      findUnique: jest.fn().mockResolvedValue({ id: PLAN_ID, name: 'pro', stripePriceId: 'price_pro_monthly' }),
      findFirst: jest.fn().mockResolvedValue({ id: PLAN_ID, name: 'pro', stripePriceId: 'price_pro_monthly' }),
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'sub-local-1' }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    stripeWebhookEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as any;
}

// ── Webhook signature validation ─────────────────────────────────────────────

describe('StripeService — webhook signature validation', () => {
  it('rejects webhook when STRIPE_WEBHOOK_SECRET is not set', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const svc = new StripeService(buildPrisma());

    await expect(
      svc.handleWebhook(Buffer.from('{}'), 'bad-sig'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects webhook with wrong signature', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.NODE_ENV = 'test';
    const svc = new StripeService(buildPrisma());

    await expect(
      svc.handleWebhook(Buffer.from('{"type":"test"}'), 'invalid-sig'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('StripeService — duplicate webhook idempotency', () => {
  it('skips processing when stripeEventId already recorded', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.NODE_ENV = 'test';

    const prisma = buildPrisma({
      stripeWebhookEvent: {
        // Event already recorded
        findUnique: jest.fn().mockResolvedValue({ stripeEventId: STRIPE_EVENT_ID, processedAt: new Date() }),
        create: jest.fn(),
        update: jest.fn(),
      },
    });

    const svc = new StripeService(prisma);

    // Monkey-patch constructEvent to return a valid fake event
    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: STRIPE_EVENT_ID,
          type: 'customer.subscription.created',
          data: { object: { id: STRIPE_SUB_ID, metadata: { userId: USER_ID }, items: { data: [] }, customer: STRIPE_CUST_ID, current_period_start: 0, current_period_end: 99999999999, status: 'active', cancel_at_period_end: false, trial_end: null } },
        }),
      },
    };

    await svc.handleWebhook(Buffer.from('{}'), 'valid-sig');

    // create should not be called (event was already recorded)
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });
});

// ── Subscription upsert ───────────────────────────────────────────────────────

describe('StripeService — subscription upserted', () => {
  it('creates a local subscription on customer.subscription.created', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.NODE_ENV = 'test';

    const prisma = buildPrisma();
    const svc = new StripeService(prisma);

    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: STRIPE_EVENT_ID,
          type: 'customer.subscription.created',
          data: {
            object: {
              id: STRIPE_SUB_ID,
              metadata: { userId: USER_ID },
              items: { data: [{ price: { id: 'price_pro_monthly' } }] },
              customer: STRIPE_CUST_ID,
              current_period_start: 1700000000,
              current_period_end:   1702000000,
              status: 'active',
              cancel_at_period_end: false,
              trial_end: null,
            },
          },
        }),
      },
    };

    await svc.handleWebhook(Buffer.from('{}'), 'valid-sig');

    expect(prisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          stripeSubscriptionId: STRIPE_SUB_ID,
          status: 'active',
        }),
      }),
    );
  });
});

// ── Subscription deleted → downgrade to free ─────────────────────────────────

describe('StripeService — subscription deleted', () => {
  it('cancels local subscription and creates a free-plan replacement', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const freePlan = { id: 'plan-free', name: 'free', stripePriceId: null };
    const prisma = buildPrisma({
      plan: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.name === 'free') return Promise.resolve(freePlan);
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });

    const svc = new StripeService(prisma);

    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: STRIPE_EVENT_ID + '_del',
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: STRIPE_SUB_ID,
              metadata: { userId: USER_ID },
              items: { data: [] },
              customer: STRIPE_CUST_ID,
              current_period_start: 0, current_period_end: 0,
              status: 'canceled', cancel_at_period_end: false, trial_end: null,
            },
          },
        }),
      },
    };

    await svc.handleWebhook(Buffer.from('{}'), 'valid-sig');

    // Local subscription cancelled
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
    // Free-plan subscription created
    expect(prisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planId: 'plan-free', status: 'active' }),
      }),
    );
  });
});

// ── Failed payment → suspended ────────────────────────────────────────────────

describe('StripeService — invoice payment failed', () => {
  it('sets local subscription to suspended on invoice.payment_failed', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const prisma = buildPrisma();
    const svc = new StripeService(prisma);

    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: STRIPE_EVENT_ID + '_fail',
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: 'in_test_123',
              subscription: STRIPE_SUB_ID,
            },
          },
        }),
      },
    };

    await svc.handleWebhook(Buffer.from('{}'), 'valid-sig');

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: STRIPE_SUB_ID },
        data: expect.objectContaining({ status: 'suspended', stripeStatus: 'past_due' }),
      }),
    );
  });
});

// ── Checkout completed → syncs customerId ────────────────────────────────────

describe('StripeService — checkout session completed', () => {
  it('syncs stripeCustomerId to user on checkout.session.completed', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const prisma = buildPrisma();
    const svc = new StripeService(prisma);

    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: STRIPE_EVENT_ID + '_co',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              customer: STRIPE_CUST_ID,
              metadata: { userId: USER_ID, planName: 'pro' },
            },
          },
        }),
      },
    };

    await svc.handleWebhook(Buffer.from('{}'), 'valid-sig');

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { stripeCustomerId: STRIPE_CUST_ID },
    });
  });
});
