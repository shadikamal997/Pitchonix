import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StripeService } from './stripe.service';
import { Request } from 'express';

/**
 * Stripe webhook receiver.
 *
 * IMPORTANT: NestJS must be configured with `rawBody: true` in main.ts so that
 * `req.rawBody` (Buffer) is available for Stripe's signature validation.
 * The route is deliberately @Public — Stripe cannot send a JWT.
 *
 * Security is enforced inside StripeService.handleWebhook() by validating the
 * `stripe-signature` header against STRIPE_WEBHOOK_SECRET.
 */
@Controller('billing/webhook')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error(
        'rawBody is undefined — ensure app.useBodyParser("json") is called with rawBody:true in main.ts',
      );
    }
    await this.stripeService.handleWebhook(rawBody, sig);
    return { received: true };
  }
}
