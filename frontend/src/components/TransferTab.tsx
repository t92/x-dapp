import React from "react";
import { Send } from "lucide-react";
import AssetSelector from "./AssetSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TransferTab() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-white">Send Crypto</h2>
        <p className="text-slate-400 text-sm">Instantly transfer assets to any wallet address</p>
      </div>

      <div className="space-y-6">
        <AssetSelector label="Asset" />

        <div className="space-y-3">
          <Label htmlFor="address" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
            Recipient Address
          </Label>
          <Input 
            id="address"
            type="text" 
            placeholder="0x..." 
            className="w-full bg-black/20 border-white/10 rounded-2xl p-6 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 font-mono text-sm h-14"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="amount" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
            Amount
          </Label>
          <div className="relative">
            <Input 
              id="amount"
              type="number" 
              placeholder="0.00" 
              className="w-full bg-black/20 border-white/10 rounded-2xl p-6 text-white text-2xl font-bold placeholder:text-slate-600 focus-visible:ring-indigo-500 h-16 pr-20"
            />
            <Button 
              size="sm"
              variant="secondary"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg h-8"
            >
              MAX
            </Button>
          </div>
        </div>

        <Button 
          size="lg"
          className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-lg h-14 rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2 border-0"
        >
          <Send className="w-5 h-5 mr-2" />
          Confirm Transfer
        </Button>
      </div>
    </div>
  );
}
