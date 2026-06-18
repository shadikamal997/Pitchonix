import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Stripe v22 exports a callable constructor via `export = StripeConstructor`.
// Use `import * as` to get the constructor, then type the instance with its
// own class type via the nested `.Stripe` type alias.
import * as StripeModule from 'stripe';

// The actual Stripe class (instance type) lives one level inside
type StripeInstance = StripeModule.Stripe;

// Use `any` for event payloads — Stripe v22 ships its event union as a
// discriminated union of 200+ types; narrowing via `event.type` is safe at
// runtime. Typing every arm explicitly adds no value and causes brittle
// version coupling.
type AnyStripeEvent = { id: string; type: string; data: { object: any } };

const STRIPE_API_VERSION = '2026-05-27.dahlia' as const;
const IK_PREFIX = 'pitchonix';

function buildStripeClient(): StripeInstance | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Return null — calls that require Stripe will throw ServiceUnavailableException
    // at invocation time rather than crashing the entire app on startup.
    return null;
  }
  // StripeModule is the callable constructor (export = StripeConstructor)
  const StripeClass = (StripeModule as any).default ?? StripeModule;
  return new StripeClass(key, { apiVersion: STRIPE_API_VERSION });
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: StripeInstance | null = buildStripeClient();

  constructor(private readonly prisma: PrismaService) {
    if (!this.stripe) {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled until key is configured.');
    }
  }

  private requireStripe(): StripeInstance {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
    }
    return this.stripe;
  }

  // ── Checkout ───────────────────────────────────────────────────────────────

  async createCheckoutSession(opts: {
    userId: string;
    planName: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const { userId, planName, successUrl, cancelUrl } = opts;

    const [user, plan] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.plan.findUnique({ where: { name: planName } }),
    ]);

    if (!user) throw new BadRequestException('User not found');
    if (!plan) throw new BadRequestException(`Plan '${planName}' not found`);
    if (!plan.stripePriceId) throw new BadRequestException(`Plan '${planName}' has no Stripe price`);

    const customerId = await this.ensureStripeCustomer(userId, user.email, user.name ?? undefined);

    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId, planName },
        subscription_data: {
          metadata: { userId, planName },
          ...(plan.name !== 'free' ? { trial_period_days: 14 } : {}),
        },
        allow_promotion_codes: true,
      } as any,
      { idempotencyKey: `${IK_PREFIX}-checkout-${userId}-${planName}-${Date.now()}` },
    );

    return (session as any).url ?? '';
  }

  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const customerId = await this.getCustomerIdForUser(userId);
    if (!customerId) throw new BadRequestException('No Stripe customer found for this user');

    const stripe = this.requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    } as any);

    return (session as any).url;
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    const stripe = this.requireStripe();
    let event: AnyStripeEvent;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) as AnyStripeEvent;
    } catch (err: any) {
      this.logger.error(`Stripe signature validation failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature invalid: ${err.message}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type} [${event.id}]`);

    const processed = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (processed) {
      this.logger.log(`Duplicate webhook ignored: ${event.id}`);
      return;
    }

    await this.prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: null,
        payload: event as any,
      },
    });

    try {
      await this.dispatch(event);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { processedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Webhook handler error for ${event.type}: ${err.message}`, err.stack);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { errorMessage: String(err.message) },
      }).catch(() => {});
      throw err;
    }
  }

  private async dispatch(event: AnyStripeEvent): Promise<void> {
    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(obj);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpserted(obj);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(obj);
        break;
      case 'invoice.payment_succeeded':
        await this.onInvoicePaymentSucceeded(obj);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(obj);
        break;
      case 'invoice.finalized':
        this.logger.log(`Invoice finalized: ${obj?.id}`);
        break;
      case 'payment_intent.succeeded':
        this.logger.log(`PaymentIntent succeeded: ${obj?.id}`);
        break;
      case 'payment_intent.payment_failed':
        this.logger.warn(`PaymentIntent failed: ${obj?.id}`);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private async onCheckoutCompleted(session: any): Promise<void> {
    const userId   = session.metadata?.userId;
    const planName = session.metadata?.planName;
    if (!userId || !planName) {
      this.logger.warn(`checkout.session.completed missing metadata: ${session.id}`);
      return;
    }

    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    if (customerId) {
      await this.prisma.user.updateMany({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    this.logger.log(`Checkout completed for user ${userId}, plan ${planName}`);
  }

  private async onSubscriptionUpserted(stripeSub: any): Promise<void> {
    const userId = stripeSub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`subscription event missing userId metadata: ${stripeSub.id}`);
      return;
    }

    const priceId   = stripeSub.items?.data?.[0]?.price?.id ?? null;
    const plan      = priceId
      ? await this.prisma.plan.findFirst({ where: { stripePriceId: priceId } })
      : null;

    const periodStart = new Date(stripeSub.current_period_start * 1000);
    const periodEnd   = new Date(stripeSub.current_period_end   * 1000);
    const trialEnd    = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
    const localStatus = this.mapStripeStatus(stripeSub.status);
    const customerId  = typeof stripeSub.customer === 'string'
      ? stripeSub.customer
      : stripeSub.customer?.id;

    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: localStatus,
          stripeStatus: stripeSub.status,
          stripePriceId: priceId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          trialEnd,
          ...(plan ? { planId: plan.id } : {}),
        },
      });
    } else if (plan) {
      await this.prisma.subscription.updateMany({
        where: { userId, status: { in: ['active', 'trialing'] } },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });

      await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: localStatus,
          stripeCustomerId: customerId,
          stripeSubscriptionId: stripeSub.id,
          stripeStatus: stripeSub.status,
          stripePriceId: priceId,
          seatCount: 1,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          trialEnd,
        },
      });
    }

    this.logger.log(`Subscription upserted for user ${userId}: ${stripeSub.status}`);
  }

  private async onSubscriptionDeleted(stripeSub: any): Promise<void> {
    const updated = await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: 'cancelled', stripeStatus: 'canceled', cancelledAt: new Date() },
    });

    if (updated.count === 0) {
      this.logger.warn(`subscription.deleted: no local record for ${stripeSub.id}`);
    } else {
      const userId = stripeSub.metadata?.userId;
      if (userId) {
        const freePlan = await this.prisma.plan.findUnique({ where: { name: 'free' } });
        if (freePlan) {
          const now = new Date();
          const freeEnd = new Date(now);
          freeEnd.setFullYear(freeEnd.getFullYear() + 100);
          await this.prisma.subscription.create({
            data: {
              userId,
              planId: freePlan.id,
              status: 'active',
              seatCount: 1,
              currentPeriodStart: now,
              currentPeriodEnd: freeEnd,
            },
          });
        }
      }
    }
  }

  private async onInvoicePaymentSucceeded(invoice: any): Promise<void> {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (subId) {
      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subId },
        data: { status: 'active', stripeStatus: 'active' },
      });
    }
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
  }

  private async onInvoicePaymentFailed(invoice: any): Promise<void> {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (subId) {
      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subId },
        data: { status: 'suspended', stripeStatus: 'past_due' },
      });
    }
    this.logger.warn(`Invoice payment FAILED: ${invoice.id}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async ensureStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const stripe = this.requireStripe();
    const customer = await stripe.customers.create(
      { email, name, metadata: { userId } } as any,
      { idempotencyKey: `${IK_PREFIX}-customer-${userId}` },
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: (customer as any).id },
    });

    return (customer as any).id;
  }

  private async getCustomerIdForUser(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.stripeCustomerId ?? null;
  }

  private mapStripeStatus(status: string): string {
    switch (status) {
      case 'active':   return 'active';
      case 'trialing': return 'trialing';
      case 'past_due': return 'suspended';
      case 'canceled': return 'cancelled';
      case 'unpaid':   return 'suspended';
      case 'paused':   return 'suspended';
      default:         return 'suspended';
    }
  }
}
