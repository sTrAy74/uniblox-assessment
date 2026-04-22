## Decision: Build It in Next.js API Routes (Node-Compatible)

**Context:** What problem were you solving?  
I needed to deliver quickly with a stack that is easy to run, easy to share, and aligned with a Node.js-first ecosystem.

**Options Considered:**
- Option A: Build a separate backend service (Express/Nest) and optionally a separate frontend.
- Option B: Use Next.js with API routes so backend endpoints and frontend live in one codebase.

**Choice:**  
Option B.

**Why:**  
 I usually optimize for delivery speed and maintainability first when scope is clear. Next.js gave fast setup, straightforward deployment, and strong Node.js compatibility without creating extra service boundaries too early. The trade-off is tighter coupling between UI and API runtime, which is acceptable for this assignment and can be split later if needed.

## Decision: Keep Cart and Checkout as Explicit Endpoints

**Context:** What problem were you solving?  
The required user flow is clear: add items to cart, then checkout, then place an order with optional coupon validation.

**Options Considered:**
- Option A: Collapse behavior into a broader order endpoint with mixed responsibilities.
- Option B: Keep dedicated endpoints for cart actions and checkout actions.

**Choice:**  
Option B.

**Why:**  
Separating cart lifecycle from checkout validation keeps APIs focused and easier to reason about. It mirrors frontend flow, so debugging becomes faster because failures are isolated to either cart calculation or checkout validation. The trade-off is one extra route to maintain, but clarity and testability are better.

## Decision: Add Custom Coupon Parameters to Admin Generation

**Context:** What problem were you solving?  
The reward system is automatic for nth orders, but I still needed strong control for testing edge cases and validating discount logic.

**Options Considered:**
- Option A: Only allow fixed coupon generation with hardcoded defaults.
- Option B: Allow admin to pass custom parameters (discount percent and expiry) during coupon generation.

**Choice:**  
Option B.

**Why:**  
Custom parameters made functional testing much more practical because I could validate limits, expiry behavior, and invalid scenarios without changing code repeatedly. The trade-off is stricter validation logic in admin APIs and slightly larger misuse surface area. I accepted that because correctness testing for coupon flows was a higher priority.

## Decision: Expose Orders Endpoint for Correctness and QA

**Context:** What problem were you solving?  
I needed a reliable way to verify that cart items, coupon application, and final totals were persisted correctly after checkout.

**Options Considered:**
- Option A: Keep order data internal and validate only from checkout response.
- Option B: Expose an orders endpoint that returns placed order records.

**Choice:**  
Option B.

**Why:**  
The orders endpoint became a source of truth for end-to-end verification across repeated test runs. It made it easy to confirm behavior after different cart and coupon combinations and reduced guesswork during debugging. The trade-off is exposing extra read surface, so this should stay scoped and sanitized as the project grows.

## Decision: Expose Coupons Endpoint for Visibility and Frontend Needs

**Context:** What problem were you solving?  
Coupon behavior is central to this exercise, and I needed visibility into generated and usable coupons for testing and future UI workflows.

**Options Considered:**
- Option A: Keep coupons write-only and validate only at checkout.
- Option B: Add a coupons listing endpoint for inspection and frontend usage.

**Choice:**  
Option B.

**Why:**  
This made testing much easier because coupon lifecycle was directly observable instead of being inferred from pricing results. It also supports likely frontend needs, such as showing available or recently issued coupons. The trade-off is maintaining an additional API contract, which is worth it for QA speed and product usability.

## Decision: Implement Admin Metrics as a Dedicated Reporting API

**Context:** What problem were you solving?  
The requirement asks for aggregated numbers: purchased item count, revenue, discount codes, and total discounts given.

**Options Considered:**
- Option A: Compute summary ad-hoc from raw order data in each client.
- Option B: Provide a dedicated admin metrics endpoint with centralized calculations.

**Choice:**  
Option B.

**Why:**  
Centralizing reporting rules in one API avoids duplicate logic across clients and keeps business numbers consistent. It also makes future rule changes easier because update scope stays on the backend. The trade-off is backend ownership of reporting semantics, but that is usually the right place for evolving business logic.

## Decision: Use In-Memory State with Explicit Scope Boundaries

**Context:** What problem were you solving?  
This task evaluates API and business-rule correctness, and I wanted to avoid over-investing in infrastructure not required by scope.

**Options Considered:**
- Option A: Introduce a database layer from the start.
- Option B: Use an in-memory store and document its limitations clearly.

**Choice:**  
Option B.

**Why:**  
In-memory state kept implementation lean and let me focus effort on cart, checkout, coupon generation, and reporting rules. The downside is non-durable data and single-process limitations, which are not production-ready. I accepted that trade-off intentionally and kept logic structured so a repository/db layer can be added later.

## Decision: Validate Coupon Eligibility at Checkout Boundary

**Context:** What problem were you solving?  
Coupon correctness depends on multiple checks (existence, validity, expiry, and usable discount range), and failures should happen before order side effects.

**Options Considered:**
- Option A: Apply coupon optimistically and resolve errors deeper in order creation.
- Option B: Validate coupon eligibility first at checkout API boundary, then place order.

**Choice:**  
Option B.

**Why:**  
Early validation keeps behavior deterministic and prevents partially applied pricing logic. It also gives clients clear error responses before order placement, improving API reliability and debugging speed. The trade-off is more strict logic at boundary level, but that is the right place because discount errors directly impact trust and revenue.
