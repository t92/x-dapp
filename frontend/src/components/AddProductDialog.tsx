import React, { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Goods__factory } from "@/typechain-types";
import { useWeb3Store } from "@/store/useWeb3Store";
import { GOODS } from "@/contractAddress";
import { parseEther } from "ethers";

type AddProductDialogProps = {
  open: boolean;
  onClose: () => void;
};

interface FormType {
  name: string;
  desc: string;
  price: string;
  stock: string;
  imgurl: string;
  chain_id: string;
}

type AddProductRequest = FormType;

type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

export default function AddProductDialog({ open, onClose }: AddProductDialogProps) {
  const { signer } = useWeb3Store()
  const goodsContract = signer ? Goods__factory.connect(GOODS, signer) : null


  const { handleSubmit, register } = useForm<FormType>({
    defaultValues: {
      name: "",
      desc: "",
      price: "",
      stock: "",
      imgurl: "",
      chain_id: "1"
    },
  });

  const handleSend = useCallback(async (data: AddProductRequest) => {
    if (!goodsContract) {
      throw new Error("Wallet not connected")
    }
    const tx = await goodsContract.addProduce(data.name, parseEther(data.price));
    const receipt = await tx.wait();

    let productId: bigint | null = null;
    for (const log of receipt!.logs) {
      try {
        const parsed = goodsContract.interface.parseLog(log);
        if (parsed?.name === "ProductAdded") {
          productId = parsed.args.id as bigint;
          break;
        }
      } catch { }
    }

    if (productId === null) {
      throw new Error("ProductAdded event not found");
    }
    data.chain_id = productId.toString();
    console.log(data)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/add_product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    const res: ApiResponse = await response.json()

    if (!response.ok || res.code !== 200) {
      throw new Error(res.message || "Add product failed")
    }
    console.log(res)
  }, [goodsContract]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Add Product</h3>
            <p className="mt-1 text-sm text-slate-400">Fill in product details. You can connect on-chain creation logic later.</p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(handleSend)}>
          <input type="hidden" {...register("chain_id")} />
          <div className="space-y-1.5">
            <Label className="text-slate-200">name</Label>
            <Input
              placeholder="Product name"
              className="h-10 border-white/15 bg-white/5 text-white"
              {...register("name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-200">desc</Label>
            <textarea
              placeholder="Product description"
              className="min-h-[90px] w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus-visible:border-emerald-400"
              {...register("desc")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-200">price</Label>
              <Input
                placeholder="0.00"
                className="h-10 border-white/15 bg-white/5 text-white"
                {...register("price")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-200">stock</Label>
              <Input
                placeholder="Stock quantity"
                className="h-10 border-white/15 bg-white/5 text-white"
                {...register("stock")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-200">imgurl</Label>
            <Input
              placeholder="https://..."
              className="h-10 border-white/15 bg-white/5 text-white"
              {...register("imgurl")}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-500 text-white hover:bg-emerald-400">
              Add Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
