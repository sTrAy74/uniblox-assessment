import Storefront from "@/components/storefront";
import { PRODUCTS } from "@/lib/store/data";

export default function Home() {
  return <Storefront products={PRODUCTS} />;
}
