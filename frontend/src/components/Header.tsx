"use client";

import { Sparkles, Wallet, LogOut, Loader2 } from "lucide-react";
import { useWeb3Store } from "@/store/useWeb3Store";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { account, isConnecting, connectWallet, disconnect } = useWeb3Store();

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="w-full flex justify-between items-center mb-16 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
          <Sparkles className="w-6 h-6 text-indigo-300" />
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200">
          Nexus DApp
        </h1>
      </div>

      {!account ? (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all h-11 px-6 group"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 text-indigo-300 animate-spin mr-2" />
          ) : (
            <Wallet className="w-4 h-4 text-indigo-300 group-hover:text-white transition-colors mr-2" />
          )}
          <span className="font-medium">
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </span>
        </Button>
      ) : (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center border border-white/20">
            <span className="text-[10px] font-bold text-white uppercase">{account.substring(2, 4)}</span>
          </div>
          <span className="font-mono text-sm font-medium text-slate-200">
            {formatAddress(account)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-red-400"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
