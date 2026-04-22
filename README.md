# Demo E-commerce Store (Next.js)

This is a demo store backend/frontend foundation built with Next.js App Router.

## Scripts

- `npm run dev` - start local development server
- `npm run lint` - run eslint
- `npm run test` - run unit tests with Vitest

## API Endpoints

### Cart

- `GET /api/cart` - fetch current cart summary
- `POST /api/cart` - add item to cart
  - body: `{ "productId": "p-001", "quantity": 2 }`
- `PATCH /api/cart` - update item quantity
  - body: `{ "productId": "p-001", "quantity": 3 }`
- `DELETE /api/cart` - remove item from cart
  - body: `{ "productId": "p-001" }`

### Checkout

- `POST /api/checkout` - place order and optionally apply coupon
  - body: `{ "couponCode": "SAVE10-ABC123" }` (`couponCode` optional)

### Admin

- `POST /api/admin/discounts/generate` - generate coupon when the current order count satisfies the nth-order condition
  - with `n=2`, this is allowed only when successful order count is divisible by `2`
  - per milestone, admin generation is capped to one coupon
- `GET /api/admin/metrics` - fetch:
  - purchased items count
  - revenue
  - discount codes count
  - total discounts given

### Debug Visibility (Demo)

- `GET /api/orders` - list placed orders
- `GET /api/orders/history` - list checkout history summary:
  - pre-discount total
  - coupon code used (if any)
  - discount amount
  - post-discount total
- `GET /api/coupons` - list issued coupons

## Discount Rule

- Every **2nd successful order** auto-issues one coupon from checkout.
- For the same milestone, admin can generate one additional coupon.
- This caps coupon issuance to **2 coupons per milestone**: one auto + one admin.
- Coupon discount is **10%**.
- Coupon is **single-use**.
- Coupon validity is **2 hours** from issue time.
