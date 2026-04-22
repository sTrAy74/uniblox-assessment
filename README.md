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

- `POST /api/admin/discounts/generate` - generate coupon only when condition is satisfied
  - condition: at least one unclaimed reward for every 2 successful orders
- `GET /api/admin/metrics` - fetch:
  - purchased items count
  - revenue
  - discount codes count
  - total discounts given

### Debug Visibility (Demo)

- `GET /api/orders` - list placed orders
- `GET /api/coupons` - list issued coupons

## Discount Rule

- Every **2nd successful order** makes the store eligible for one coupon generation.
- Coupon generation is done through the admin API.
- Coupon discount is **10%**.
- Coupon is **single-use**.
- Coupon validity is **2 hours** from issue time.
