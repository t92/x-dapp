import React, { useState } from "react";
import { Coins, CircleDollarSign } from "lucide-react";
import { useWeb3Store } from "@/store/useWeb3Store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { USDC } from "@/contractAddress";
import { ZeroAddress } from "ethers";


interface AssetSelectorProps {
  label?: string;
  onSelect?: (address: string, symbol: string) => void;
}

const ASSET_META: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  ETH: { name: "Ethereum", icon: Coins, color: "bg-indigo-500" },
  USDC: { name: "USDC", icon: CircleDollarSign, color: "bg-blue-500" },
};

export default function AssetSelector({ label = "Asset", onSelect }: AssetSelectorProps) {
  const { balance } = useWeb3Store();
  const [selectedSymbol, setSelectedSymbol] = useState(ZeroAddress);

  const defaultAssets = [
    { symbol: 'ETH', balance: '0.00' },
    { symbol: 'USDC', balance: '0.00' }
  ];
  const availableAssets = (balance && balance.length > 0) ? balance : defaultAssets;

  const selectedItem = availableAssets.find(b => b.symbol === selectedSymbol) || availableAssets[0];
  const SelectedIcon = ASSET_META[selectedItem.symbol]?.icon || Coins;
  const selectedColor = ASSET_META[selectedItem.symbol]?.color || "bg-indigo-500";
  const selectedName = ASSET_META[selectedItem.symbol]?.name || selectedItem.symbol;

  return (
    <div className="space-y-2 relative">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
        {label}
      </label>

      <Select
        value={selectedSymbol}
        onValueChange={(val) => {
          if (val) {
            setSelectedSymbol(val);
            const value = val === 'ETH' ? ZeroAddress : USDC
            if (onSelect) onSelect(value, val);
          }
        }}
      >
        <SelectTrigger className="w-full h-14 pl-4 pr-4 bg-black/20 border-white/10 rounded-2xl hover:bg-black/30 transition-colors focus:ring-1 focus:ring-indigo-500/50 [&>svg]:opacity-50">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${selectedColor} rounded-full flex items-center justify-center border border-white/20`}>
                <SelectedIcon className="w-4 h-4 text-white" />
              </div>
              <div className="text-left flex flex-col justify-center">
                <p className="font-semibold text-white text-sm leading-tight">{selectedName}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">{selectedItem.symbol}</p>
              </div>
            </div>
            {Number(selectedItem.balance) > 0 && (
              <p className="text-sm font-mono text-emerald-400 pr-2">
                {Number(selectedItem.balance).toFixed(4)}
              </p>
            )}
          </div>
        </SelectTrigger>

        <SelectContent className="bg-slate-900 border-white/10 rounded-xl shadow-2xl">
          {availableAssets.map((asset) => {
            const Icon = ASSET_META[asset.symbol]?.icon || Coins;
            const color = ASSET_META[asset.symbol]?.color || "bg-indigo-500";
            const name = ASSET_META[asset.symbol]?.name || asset.symbol;

            return (
              <SelectItem
                key={asset.symbol}
                value={asset.symbol}
                className="group hover:bg-indigo-500/20 focus:bg-indigo-500/20 focus:text-white cursor-pointer py-3 px-2 rounded-lg my-1 mx-1 data-[state=checked]:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between min-w-[200px] sm:min-w-[400px] w-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center border border-white/20`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      <p className="font-semibold text-white text-sm leading-tight">{name}</p>
                      <p className="text-xs text-slate-400 group-hover:text-slate-300 group-focus:text-slate-300 transition-colors leading-tight">{asset.symbol}</p>
                    </div>
                  </div>
                  {Number(asset.balance) > 0 && (
                    <p className="text-sm font-mono text-emerald-400 ml-auto pr-2">
                      {Number(asset.balance).toFixed(4)}
                    </p>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
