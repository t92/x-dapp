"use client";

import { useState } from "react";
import { BrowserProvider, Contract, isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { RED_PACKET } from "@/contractAddress";
import { useWeb3Store } from "@/store/useWeb3Store";

const debugAbi = ["function nextPacketId() view returns (uint256)"];

type DebugResult = {
  account: string | null;
  chainId: string;
  rpcCode: string;
  codeLength: number;
  nextPacketId: string;
  error: string | null;
};

export default function DebugRedPacketPage() {
  const { account, connectWallet } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      if (!RED_PACKET || !isAddress(RED_PACKET)) {
        throw new Error(`RED_PACKET invalid: ${RED_PACKET}`);
      }

      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("Wallet provider not found");
      }

      if (!account) {
        await connectWallet();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const activeAccount = await signer.getAddress();
      const network = await provider.getNetwork();
      const rpcCode = await provider.getCode(RED_PACKET);

      let nextPacketId = "-";
      if (rpcCode !== "0x") {
        const contract = new Contract(RED_PACKET, debugAbi, provider);
        const value = await contract.nextPacketId();
        nextPacketId = value.toString();
      }

      const payload: DebugResult = {
        account: activeAccount,
        chainId: network.chainId.toString(),
        rpcCode: rpcCode === "0x" ? "0x" : `${rpcCode.slice(0, 18)}...`,
        codeLength: rpcCode.length,
        nextPacketId,
        error: null,
      };
      setResult(payload);
      console.log("[debug-redpacket]", {
        ...payload,
        fullCode: rpcCode,
        redPacket: RED_PACKET,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setResult({
        account: account ?? null,
        chainId: "-",
        rpcCode: "-",
        codeLength: 0,
        nextPacketId: "-",
        error: message,
      });
      console.error("[debug-redpacket] error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 text-white">
      <h1 className="text-2xl font-bold">Debug RedPacket</h1>
      <div className="space-y-2 text-sm text-slate-300">
        <p>Contract: {RED_PACKET}</p>
        <p>Purpose: verify chain, getCode, nextPacketId.</p>
      </div>

      <Button onClick={runCheck} disabled={loading}>
        {loading ? "Checking..." : "Run Check"}
      </Button>

      {result && (
        <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs overflow-auto">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
