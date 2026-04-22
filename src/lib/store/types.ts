export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CartSummary = {
  items: CartLine[];
  subtotal: number;
  totalItems: number;
};

export type AddToCartRequest = {
  productId: string;
  quantity?: number;
};

export type UpdateCartItemRequest = {
  productId: string;
  quantity: number;
};

export type RemoveCartItemRequest = {
  productId: string;
};
