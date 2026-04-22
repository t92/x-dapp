import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Coins, Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AddProductDialog from "@/components/AddProductDialog";
import PurchaseRecordsDialog from "@/components/PurchaseRecordsDialog";
import { XXB__factory } from "@/typechain-types";
import { Goods__factory } from "@/typechain-types";
import { XXB, GOODS } from "@/contractAddress";
import { useWeb3Store } from "@/store/useWeb3Store";
import { toast } from "sonner";
import { Product, ApiResponse } from "@/types";

const toastOption = {
  position: 'top-center' as const,
  className: 'bg-black/50 border-white/10 text-white',
}

async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${process.env.BASE_URL}/get_products`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res: ApiResponse<Product[]> = await response.json();

  if (!response.ok || res.code !== 200) {
    throw new Error(res.message || "Get products failed");
  }

  return res.data ?? [];
}


export default function ShopTab() {
  const { provider, signer, account } = useWeb3Store()
  const xxbReadContract = useMemo(
    () => (provider ? XXB__factory.connect(XXB, provider) : null),
    [provider],
  );
  const xxbWriteContract = useMemo(
    () => (signer ? XXB__factory.connect(XXB, signer) : null),
    [signer],
  );
  const goodsReadContract = useMemo(
    () => (provider ? Goods__factory.connect(GOODS, provider) : null),
    [provider],
  );
  const goodsWriteContract = useMemo(
    () => (signer ? Goods__factory.connect(GOODS, signer) : null),
    [signer],
  );

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingProductId, setBuyingProductId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);


  const loadProducts = useCallback(async () => {
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (error) {
      console.error("[ShopTab] load products failed:", error);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    if (!goodsReadContract || !account) {
      setIsOwner(false);
      return;
    }
    const owner = await goodsReadContract.owner();
    setIsOwner(owner.toLowerCase() === account.toLowerCase());
  }, [goodsReadContract, account])

  const handleBuy = useCallback(
    async (product: Product) => {
      try {
        if (!goodsWriteContract || !goodsReadContract || !xxbWriteContract || !xxbReadContract || !signer || !account) {
          throw new Error("Wallet not connected");
        }
        setBuyingProductId(product.id);

        let onchainProductId: bigint;
        try {
          onchainProductId = BigInt(product.chain_id);
        } catch {
          throw new Error(`Invalid on-chain product id: ${product.chain_id}`);
        }

        const onchainProduct = await goodsReadContract.products(onchainProductId);
        if (!onchainProduct.active) {
          throw new Error(`On-chain product not active: ${onchainProductId.toString()}`);
        }

        const totalCost = onchainProduct.price;

        const balance = await xxbReadContract.balanceOf(account);
        if (balance < totalCost) {
          const missing = totalCost - balance;
          const swapTx = await xxbWriteContract.buy({ value: missing });
          await swapTx.wait();
        }

        const allowance = await xxbReadContract.allowance(account, GOODS);
        if (allowance < totalCost) {
          const approveTx = await xxbWriteContract.approve(GOODS, totalCost);
          await approveTx.wait();
        }
        const buyTx = await goodsWriteContract.buy(onchainProductId);
        await buyTx.wait();

        const response = await fetch(`${process.env.BASE_URL}/buy_product`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: product.id,
            amount: 1,
            price: product.price,
            chain_id: product.chain_id,
            address: account,
          }),
        });
        const res: ApiResponse = await response.json();
        toast.success("Buy product success", toastOption);
        if (!response.ok || res.code !== 200) {
          throw new Error(res.message || "Buy product failed");
        }

        await loadProducts();
      } catch (error) {
        console.error("[ShopTab] buy product failed:", error);
      } finally {
        setBuyingProductId(null);
      }
    },
    [loadProducts, goodsWriteContract, goodsReadContract, xxbWriteContract, xxbReadContract, signer, account],
  );


  useEffect(() => {
    void loadStatus();
    void loadProducts();
  }, [loadProducts, loadStatus]);

  return (
    <div>
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-white">DApp Store</h2>
            <p className="text-sm text-slate-400">Discover digital assets and premium services</p>
          </div>
          <Button variant="ghost" className="h-9 px-3 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {isOwner && (
            <Button
              type="button"
              className="h-9 border border-emerald-400/30 bg-emerald-500/20 px-3 text-emerald-200 hover:bg-emerald-500/30"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Product
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-9 border border-sky-400/20 px-3 text-sky-300 hover:bg-sky-400/10 hover:text-sky-200"
            onClick={() => setRecordsDialogOpen(true)}
          >
            <ReceiptText className="mr-1 h-4 w-4" />
            Purchase Records
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, idx) => (
          <Card
            key={product.id}
            className={`group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition-all hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] delay-${(idx + 1) * 100}`}
          >
            <div className="relative h-48 overflow-hidden border-b border-white/5">
              <img
                src={product.img_url || "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&q=80"}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute right-3 top-3 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md">
                {product.stock > 0 ? "Available" : "Sold Out"}
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col p-4">
              <h3 className="mb-1 text-lg font-semibold text-white transition-colors group-hover:text-emerald-400">{product.name}</h3>
              <div className="mb-4 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-emerald-400">{`${product.price} XXB = ${product.price} ETH`}</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">Stock: {product.stock}</p>
              <Button
                type="button"
                disabled={product.stock <= 0 || buyingProductId === product.id}
                onClick={() => void handleBuy(product)}
                className="mt-auto w-full rounded-xl border border-white/10 bg-white/5 font-medium text-white transition-colors hover:border-emerald-500 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buyingProductId === product.id ? "Purchasing..." : product.stock <= 0 ? "Sold Out" : "Buy Now"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddProductDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
      <PurchaseRecordsDialog open={recordsDialogOpen} onClose={() => setRecordsDialogOpen(false)} />
    </div>
  );
}
