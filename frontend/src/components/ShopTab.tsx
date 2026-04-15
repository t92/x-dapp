import React from "react";
import { ChevronRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ShopTab() {
  const products = [
    { id: 1, name: "Premium NFT Pass", price: "0.5 ETH", image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&q=80", category: "Digital" },
    { id: 2, name: "DeFi Mastery Course", price: "0.15 ETH", image: "https://images.unsplash.com/photo-1639762681485-074b7f4ec651?w=500&q=80", category: "Education" },
    { id: 3, name: "Hardware Wallet", price: "0.08 ETH", image: "https://images.unsplash.com/photo-1642104704074-cecbff5d9095?w=500&q=80", category: "Hardware" },
    { id: 4, name: "Metaverse Land", price: "1.2 ETH", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80", category: "Virtual" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white">DApp Store</h2>
          <p className="text-slate-400 text-sm">Discover digital assets and premium services</p>
        </div>
        <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 h-9 px-3">
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, idx) => (
          <Card 
            key={product.id} 
            className={`group bg-black/20 border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] flex flex-col delay-${(idx + 1) * 100}`}
          >
            <div className="relative h-48 overflow-hidden border-b border-white/5">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md text-xs font-semibold text-white border border-white/10">
                {product.category}
              </div>
            </div>
            <CardContent className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg mb-1 group-hover:text-emerald-400 transition-colors text-white">{product.name}</h3>
              <div className="flex items-center gap-1.5 mb-4">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">{product.price}</span>
              </div>
              <Button 
                className="mt-auto w-full bg-white/5 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors border border-white/10 hover:border-emerald-500"
              >
                Buy Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
