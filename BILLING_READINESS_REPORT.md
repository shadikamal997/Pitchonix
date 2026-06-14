# BILLING READINESS REPORT
## Phase Ω.PRODUCT.4 — Phase 8: Billing & Quotas Audit
**Date:** 2026-06-12  
**Method:** Verified code inspection — full 2076-line schema searched  
**Scope:** Subscription plans, usage tracking, storage quotas, export quotas, workspace limits, seat limits

---

## 1. BILLING SYSTEM

**Schema search result:** Zero matches for `Subscription`, `Invoice`, `BillingPlan`, `PricingTier`, `PaymentMethod`, `Billing` across all 61 models.

**Code search result:** Zero billing-related modules, services, or controllers found under `backend/src/`.

**No billing system exists.**

---

## 2. SUBSCRIPTION PLANS

| Capability | Status |
|-----------|--------|
| Plan model (Free/Pro/Enterprise) | ❌ Not implemented |
| Plan assignment to user/workspace | ❌ Not implemented |
| Plan enforcement at API level | ❌ Not implemented |
| Trial period logic | ❌ Not implemented |
| Upgrade/downgrade flows | ❌ Not implemented |
| Payment gateway (Stripe/Paddle) | ❌ Not implemented |
| Invoice generation | ❌ Not implemented |
| Billing webhook handling | ❌ Not implemented |

---

## 3. USAGE TRACKING

Usage tracking exists but is **not connected to billing enforcement**:

| Metric | Tracked | Enforced | Evidence |
|--------|:-------:|:--------:|---------|
| Export count per project | ✅ | ❌ | `Project.exportCount` — incremented, never blocked |
| View count per project | ✅ | ❌ | `Project.viewCount` — analytics only |
| Upload file size | ✅ | ❌ | `UploadedAsset.sizeBytes` — recorded, not aggregated |
| Career/CV telemetry events | ✅ | ❌ | `BetaTelemetry` — analytics only |
| Content node lifecycle | ✅ | ❌ | `ContentNode` — quality certification only |
| API request rate | ✅ | ✅ | IP-based throttle (not plan-based) |

---

## 4. STORAGE QUOTAS

| Quota | Status | Evidence |
|-------|--------|---------|
| Per-user storage limit | ❌ | `sizeBytes` stored, aggregate never computed |
| Per-workspace storage limit | ❌ | Not implemented |
| Per-file upload limit | ✅ | 10MB max request body (`main.ts:58-59`) |
| Storage overage handling | ❌ | Not implemented |
| Storage usage dashboard | ❌ | Not implemented |

---

## 5. EXPORT QUOTAS

| Quota | Status | Evidence |
|-------|--------|---------|
| Export limit per plan | ❌ | Not implemented |
| Export count tracked | ✅ | `Project.exportCount` incremented |
| Export blocking on limit | ❌ | Counter never checked against a limit |
| Export job retention (30d cleanup) | ⚠️ | Optional manual maintenance task |

---

## 6. WORKSPACE LIMITS

| Limit | Status | Evidence |
|-------|--------|---------|
| Workspace count per org | ❌ | Unlimited workspaces per organization |
| Project count per workspace | ❌ | Unlimited projects |
| Deck count per project | ❌ | Unlimited |
| Storage per workspace | ❌ | No quota |

---

## 7. SEAT LIMITS

| Limit | Status | Evidence |
|-------|--------|---------|
| Member count per workspace | ❌ | `WorkspaceMember` accepts unlimited members |
| Seat-based pricing | ❌ | Not implemented |
| Seat overage handling | ❌ | Not implemented |
| Guest / external reviewer seats | ❌ | All members treated equally for quota purposes |

---

## 8. RATE LIMITING (Non-Billing)

Rate limiting exists as an abuse-prevention layer, not as a billing mechanism:

**Global throttle** (`app.module.ts:86-102`):
- Short: 60 req/sec
- Medium: 100 req/min
- Long: 1000 req/hr
- **IP-based** — same limits for all users regardless of plan

**Endpoint-specific limits** (`common/middleware/rate-limit.middleware.ts`):
- ATS Analysis: 30 req/min
- Job Matching: 30 req/min
- Document Creation: 10 req/min
- Apply Fix: 20 req/min
- Default: 100 req/min

**Note:** In-memory store — rate limits reset on process restart; not shared across multiple backend instances.

---

## 9. BILLING READINESS SUMMARY

| Requirement | Status |
|-------------|--------|
| Subscription model exists | ❌ |
| Plan enforcement exists | ❌ |
| Usage tracked for billing | ❌ |
| Storage quota enforced | ❌ |
| Export quota enforced | ❌ |
| Seat limits enforced | ❌ |
| Payment gateway integrated | ❌ |
| Invoice system | ❌ |
| Billing portal | ❌ |
| Usage-based metering | ❌ |

**Billing Score: 5/100** (5 points for usage counter infrastructure that could support billing)

**The platform is currently a free/open-access system.** To support SMB/enterprise billing:

1. Choose a payment gateway (Stripe recommended)
2. Add `Plan`, `Subscription`, `Invoice` models to schema
3. Add `planId` FK to `Workspace` or `User`
4. Implement quota enforcement middleware that checks plan limits before creating resources
5. Add usage aggregation queries (sum sizeBytes per workspace, count exports per billing period)
6. Build billing portal pages (plan selection, payment, invoice history)
7. Implement webhook handler for subscription lifecycle events

---

*All findings verified via direct code inspection. The absence of billing infrastructure is confirmed by zero matching models in the 2076-line Prisma schema.*
