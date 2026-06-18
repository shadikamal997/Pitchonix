import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

// =============================================================================
//  Phase Ω.4B / Ω.CERT.3 — BillingController
//
//  Authenticated billing API:
//    GET    /billing/plans              — list available plans
//    GET    /billing/subscription       — current user's subscription + usage
//    POST   /billing/subscription       — subscribe to a plan (local; Stripe via checkout)
//    DELETE /billing/subscription       — cancel subscription at period end
//    GET    /billing/usage              — current period usage + quota status
//    POST   /billing/usage              — record a usage event (internal/hook)
//    POST   /billing/checkout           — create Stripe Checkout session
//    POST   /billing/portal             — create Stripe Customer Portal session
// =============================================================================

@Controller('billing')
@UseGuards() // JwtAuthGuard is global
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
  ) {}

  @Get('plans')
  listPlans() {
    return this.billing.listPlans();
  }

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const userId = req.user?.id;
    const sub = await this.billing.getOrCreateFreeSubscription(userId);
    return sub;
  }

  @Post('subscription')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Req() req: any, @Body() body: { plan: string; workspaceId?: string }) {
    const userId = req.user?.id;
    return this.billing.subscribe(userId, body.plan, body.workspaceId);
  }

  @Delete('subscription')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Req() req: any) {
    const userId = req.user?.id;
    return this.billing.cancelSubscription(userId);
  }

  @Get('usage')
  async getUsage(@Req() req: any) {
    const userId = req.user?.id;
    return this.billing.getUsage(userId);
  }

  @Post('usage')
  @HttpCode(HttpStatus.OK)
  async recordUsage(@Req() req: any, @Body() body: { metric: string; value?: number }) {
    const userId = req.user?.id;
    await this.billing.recordUsage(userId, body.metric, body.value ?? 1);
    return { ok: true };
  }

  /**
   * Create a Stripe Checkout session for upgrading to a paid plan.
   * Returns { url } — client should redirect to this URL.
   */
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @Req() req: any,
    @Body() body: { plan: string; successUrl: string; cancelUrl: string },
  ) {
    const userId = req.user?.id;
    const url = await this.stripe.createCheckoutSession({
      userId,
      planName: body.plan,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    return { url };
  }

  /**
   * Create a Stripe Customer Portal session.
   * Returns { url } — client should redirect to this URL.
   */
  @Post('portal')
  @HttpCode(HttpStatus.OK)
  async createPortal(@Req() req: any, @Body() body: { returnUrl: string }) {
    const userId = req.user?.id;
    const url = await this.stripe.createPortalSession(userId, body.returnUrl);
    return { url };
  }
}
