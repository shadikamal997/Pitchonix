import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase Ω.4B — BillingService
//
//  Data-layer billing: plans, subscriptions, usage records, quota checks.
//  No payment processor. Provides the foundation to attach Stripe/Paddle later.
// =============================================================================

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  getPlan(name: string) {
    return this.prisma.plan.findUnique({ where: { name } });
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  async getSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrCreateFreeSubscription(userId: string) {
    const existing = await this.getSubscription(userId);
    if (existing) return existing;

    const freePlan = await this.prisma.plan.findUnique({ where: { name: 'free' } });
    if (!freePlan) throw new NotFoundException('Free plan not configured');

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 100); // effectively never-expires for free

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: 'active',
        seatCount: 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  async subscribe(userId: string, planName: string, workspaceId?: string) {
    const plan = await this.prisma.plan.findUnique({ where: { name: planName } });
    if (!plan) throw new NotFoundException(`Plan '${planName}' not found`);

    // Cancel any existing active subscription for this user
    await this.prisma.subscription.updateMany({
      where: { userId, status: { in: ['active', 'trialing'] } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        workspaceId: workspaceId ?? null,
        status: 'active',
        seatCount: 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  async cancelSubscription(userId: string) {
    const sub = await this.getSubscription(userId);
    if (!sub) throw new NotFoundException('No active subscription');
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  }

  // ── Usage tracking ─────────────────────────────────────────────────────────

  async recordUsage(userId: string, metric: string, value = 1) {
    const sub = await this.getSubscription(userId);
    if (!sub) return; // free tier with no subscription — no tracking needed

    const now = new Date();
    void this.prisma.usageRecord.create({
      data: {
        subscriptionId: sub.id,
        userId,
        metric,
        value,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
      },
    }).catch(() => {});
  }

  async getUsage(userId: string) {
    const sub = await this.getSubscription(userId);
    if (!sub) {
      return { subscriptionId: null, plan: 'free', metrics: {}, periodStart: null, periodEnd: null };
    }

    const records = await this.prisma.usageRecord.groupBy({
      by: ['metric'],
      where: {
        subscriptionId: sub.id,
        periodStart: { gte: sub.currentPeriodStart },
        periodEnd: { lte: sub.currentPeriodEnd },
      },
      _sum: { value: true },
    });

    const metrics: Record<string, number> = {};
    for (const r of records) {
      metrics[r.metric] = r._sum.value ?? 0;
    }

    return {
      subscriptionId: sub.id,
      plan: sub.plan.name,
      planDisplayName: sub.plan.displayName,
      seatCount: sub.seatCount,
      status: sub.status,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      metrics,
      limits: {
        maxSeats: sub.plan.maxSeats,
        maxProjects: sub.plan.maxProjects,
        maxDecks: sub.plan.maxDecks,
        maxExports: sub.plan.maxExports,
        maxAiCalls: sub.plan.maxAiCalls,
        storageGb: sub.plan.storageGb,
      },
    };
  }

  // ── Quota checks ───────────────────────────────────────────────────────────

  async checkQuota(userId: string, metric: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    const usage = await this.getUsage(userId);
    const used = (usage.metrics[metric] ?? 0);
    const limitKey = `max${metric.charAt(0).toUpperCase()}${metric.slice(1)}` as keyof typeof usage.limits;
    const limit = (usage.limits as any)[limitKey] ?? -1;

    return { allowed: limit === -1 || used < limit, used, limit };
  }
}
