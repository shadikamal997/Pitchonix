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

// =============================================================================
//  Phase Ω.4B — BillingController
//
//  Public billing API for authenticated users:
//    GET  /billing/plans          — list available plans
//    GET  /billing/subscription   — current user's subscription + usage
//    POST /billing/subscription   — subscribe to a plan
//    DELETE /billing/subscription — cancel subscription at period end
//    GET  /billing/usage          — current period usage + quota status
//    POST /billing/usage          — record a usage event (internal/hook)
// =============================================================================

@Controller('billing')
@UseGuards() // JwtAuthGuard is global; no extra guard needed
export class BillingController {
  constructor(private readonly billing: BillingService) {}

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
}
