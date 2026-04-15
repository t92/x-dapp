"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrowserProvider, Contract, formatUnits, isAddress, ZeroAddress } from "ethers";
import { Gift, CheckCircle2, ArrowLeft, Clock3, User, MessageSquare, History } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useWeb3Store } from "@/store/useWeb3Store";
import { RED_PACKET } from "@/contractAddress";
import { toast } from "sonner";

type PacketView = {
  sender: string;
  token: string;
  totalAmount: bigint;
  remainingAmount: bigint;
  totalCount: number;
  remainingCount: number;
  deadline: bigint;
  packetType: number;
  message: string;
  refunded: boolean;
  exists: boolean;
};

type ClaimStatusView = {
  hasClaimed: boolean;
  amount: bigint;
  sender: string;
  message: string;
  token: string;
  claimedAt: bigint;
  packetId: bigint;
};

type ClaimedPacketHistory = {
  codeHash: string;
  packetId: bigint;
  amount: bigint;
  sender: string;
  token: string;
  message: string;
  claimedAt: bigint;
};

type TokenMeta = {
  decimals: number;
  symbol: string;
};

const redPacketAbi = [
  "function claim(bytes32 codeHash) returns (uint256 amount)",
  "function getPacketByCodeHash(bytes32 codeHash) view returns (uint256 packetId, (address sender, address token, uint256 totalAmount, uint256 remainingAmount, uint32 totalCount, uint32 remainingCount, uint64 deadline, uint8 packetType, string message, bool refunded, bool exists) packet)",
  "function getClaimStatusByCodeHash(bytes32 codeHash, address user) view returns (bool hasClaimed, uint256 amount, address sender, string message, address token, uint64 claimedAt, uint256 packetId)",
  "function getUserClaimHistory(address user) view returns ((bytes32 codeHash, uint256 packetId, uint256 amount, address sender, address token, string message, uint64 claimedAt)[] records)",
];
const erc20MetaAbi = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const toastOption = {
  position: "top-center" as const,
  className: "bg-black/50 border-white/10 text-white",
};

function parseCodeHash(raw: string | null) {
  if (!raw) return { value: "", valid: false };
  const normalized = raw.trim().toLowerCase();
  const withPrefix = normalized.startsWith("0x") ? normalized : `0x${normalized}`;
  return {
    value: withPrefix,
    valid: /^0x[a-f0-9]{64}$/.test(withPrefix),
  };
}

function formatUnixTs(ts: bigint) {
  if (!ts || Number(ts) === 0) return "-";
  return new Date(Number(ts) * 1000).toLocaleString();
}

export default function ClaimClient() {
  const { account, provider, signer, connectWallet } = useWeb3Store();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("codeHash") ?? searchParams.get("code");
  const parsedCodeHash = parseCodeHash(codeFromUrl);

  const [packetId, setPacketId] = useState<bigint | null>(null);
  const [packet, setPacket] = useState<PacketView | null>(null);
  const [packetNotFound, setPacketNotFound] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatusView | null>(null);
  const [claimHistory, setClaimHistory] = useState<ClaimedPacketHistory[]>([]);
  const [pendingClaimAfterConnect, setPendingClaimAfterConnect] = useState(false);
  const [loadingPacket, setLoadingPacket] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [tokenMetaByAddress, setTokenMetaByAddress] = useState<Record<string, TokenMeta>>({});

  const readProvider = useMemo(() => {
    if (provider) return provider;
    if (typeof window !== "undefined" && window.ethereum) return new BrowserProvider(window.ethereum);
    return null;
  }, [provider]);

  const readContract = useMemo(() => {
    if (!RED_PACKET || !isAddress(RED_PACKET) || !parsedCodeHash.valid) return null;
    if (!readProvider) return null;
    return new Contract(RED_PACKET, redPacketAbi, readProvider);
  }, [readProvider, parsedCodeHash.valid]);

  const writeContract = useMemo(() => {
    if (!RED_PACKET || !isAddress(RED_PACKET) || !parsedCodeHash.valid || !signer) return null;
    return new Contract(RED_PACKET, redPacketAbi, signer);
  }, [signer, parsedCodeHash.valid]);

  const getTokenKey = useCallback((token: string) => token.toLowerCase(), []);

  const ensureTokenMeta = useCallback(
    async (token: string) => {
      const tokenKey = getTokenKey(token);
      if (tokenMetaByAddress[tokenKey]) return;

      if (tokenKey === ZeroAddress.toLowerCase()) {
        setTokenMetaByAddress((prev) => ({
          ...prev,
          [tokenKey]: { decimals: 18, symbol: "ETH" },
        }));
        return;
      }

      if (!readProvider) return;
      try {
        const tokenContract = new Contract(token, erc20MetaAbi, readProvider);
        const [decimals, symbol] = await Promise.all([tokenContract.decimals(), tokenContract.symbol()]);
        setTokenMetaByAddress((prev) => ({
          ...prev,
          [tokenKey]: { decimals: Number(decimals), symbol },
        }));
      } catch (error) {
        console.error("load token meta failed", error);
      }
    },
    [getTokenKey, tokenMetaByAddress, readProvider]
  );

  const formatAmountByToken = useCallback(
    (amount: bigint, token: string) => {
      const tokenKey = getTokenKey(token);
      const meta = tokenMetaByAddress[tokenKey];
      if (!meta) return amount.toString();
      return `${formatUnits(amount, meta.decimals)} ${meta.symbol}`;
    },
    [getTokenKey, tokenMetaByAddress]
  );

  const loadPacket = useCallback(async () => {
    if (!readContract || !parsedCodeHash.valid) return;
    try {
      setLoadingPacket(true);
      setPacketNotFound(false);
      const [id, packetData] = await readContract.getPacketByCodeHash(parsedCodeHash.value);
      setPacketId(id as bigint);
      setPacket(packetData as PacketView);
      await ensureTokenMeta((packetData as PacketView).token);
    } catch (error) {
      console.error(error);
      setPacketNotFound(true);
      setPacketId(null);
      setPacket(null);
      toast.error("红包不存在或链接无效", toastOption);
    } finally {
      setLoadingPacket(false);
    }
  }, [readContract, parsedCodeHash.valid, parsedCodeHash.value, ensureTokenMeta]);

  const loadClaimStatus = useCallback(async () => {
    if (!readContract || !parsedCodeHash.valid || !account) {
      setClaimStatus(null);
      return;
    }
    try {
      setLoadingStatus(true);
      const status = (await readContract.getClaimStatusByCodeHash(
        parsedCodeHash.value,
        account
      )) as ClaimStatusView;
      setClaimStatus(status);
      await ensureTokenMeta(status.token);
    } catch (error) {
      console.error(error);
      toast.error("Failed to query claim status", toastOption);
    } finally {
      setLoadingStatus(false);
    }
  }, [readContract, parsedCodeHash.valid, parsedCodeHash.value, account, ensureTokenMeta]);

  const loadClaimHistory = useCallback(async () => {
    if (!readContract || !account) {
      setClaimHistory([]);
      return;
    }
    try {
      setLoadingHistory(true);
      const records = (await readContract.getUserClaimHistory(account)) as ClaimedPacketHistory[];
      setClaimHistory(records);
      await Promise.all(records.map((record) => ensureTokenMeta(record.token)));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load claim history", toastOption);
    } finally {
      setLoadingHistory(false);
    }
  }, [readContract, account, ensureTokenMeta]);

  const executeClaim = useCallback(async () => {
    if (!account || !signer || !writeContract) return;
    if (!parsedCodeHash.valid) {
      toast.error("Invalid code hash in URL", toastOption);
      return;
    }
    if (claimStatus?.hasClaimed) {
      return;
    }
    try {
      setLoadingClaim(true);
      const tx = await writeContract.claim(parsedCodeHash.value);
      await tx.wait();
      toast.success("Claim success", toastOption);
      await Promise.all([loadPacket(), loadClaimStatus(), loadClaimHistory()]);
    } catch (error) {
      console.error(error);
      toast.error("Claim failed", toastOption);
    } finally {
      setLoadingClaim(false);
    }
  }, [
    account,
    signer,
    writeContract,
    parsedCodeHash.valid,
    parsedCodeHash.value,
    claimStatus?.hasClaimed,
    loadPacket,
    loadClaimStatus,
    loadClaimHistory,
  ]);

  const handleClaim = async () => {
    if (!account || !signer || !writeContract) {
      setPendingClaimAfterConnect(true);
      await connectWallet();
      return;
    }
    await executeClaim();
  };

  useEffect(() => {
    void loadPacket();
  }, [loadPacket, parsedCodeHash.valid]);

  useEffect(() => {
    void loadClaimStatus();
  }, [loadClaimStatus]);

  useEffect(() => {
    void loadClaimHistory();
  }, [loadClaimHistory]);

  useEffect(() => {
    if (!pendingClaimAfterConnect || !account || !signer || !writeContract) return;
    setPendingClaimAfterConnect(false);
    void executeClaim();
  }, [pendingClaimAfterConnect, account, signer, writeContract, executeClaim]);

  return (
    <div className="min-h-screen animated-gradient-bg relative text-slate-50 overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse delay-700"></div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
        <Header />

        <div className="w-full glass-panel rounded-3xl p-8 animate-fade-in space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                <Gift className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Claim Red Packet</h2>
                <p className="text-slate-400 text-sm">Read packet from URL and claim after wallet connection.</p>
              </div>
            </div>
            <Link
              href="/?tab=redpacket"
              className="group inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/20 px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.22)] animate-pulse transition-all duration-300 hover:-translate-y-0.5 hover:bg-fuchsia-500/35 hover:text-white hover:shadow-[0_0_30px_rgba(217,70,239,0.45)]"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              我也要发
            </Link>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            {loadingPacket ? (
              <p className="text-sm text-slate-300">Loading packet...</p>
            ) : packetNotFound ? (
              <p className="text-sm text-red-300">红包不存在</p>
            ) : !packet ? (
              <p className="text-sm text-slate-300">Packet not loaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <p className="text-slate-300">Packet ID: <span className="text-white">{packetId?.toString() || "-"}</span></p>
                <p className="text-slate-300">Type: <span className="text-white">{packet.packetType === 1 ? "Equal" : "Random"}</span></p>
                <p className="text-slate-300">Total Amount: <span className="text-white">{formatAmountByToken(packet.totalAmount, packet.token)}</span></p>
                <p className="text-slate-300">Remaining: <span className="text-white">{formatAmountByToken(packet.remainingAmount, packet.token)}</span></p>
                <p className="text-slate-300">Count: <span className="text-white">{packet.remainingCount}/{packet.totalCount}</span></p>
                <p className="text-slate-300">Expired At: <span className="text-white">{formatUnixTs(packet.deadline)}</span></p>
                <p className="text-slate-300 sm:col-span-2 break-all">Sender: <span className="text-white">{packet.sender}</span></p>
                <p className="text-slate-300 sm:col-span-2">Message: <span className="text-white">{packet.message || "-"}</span></p>
              </div>
            )}
          </div>

          {!!packet && !packetNotFound && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Claim Action</h3>
                <Button
                  type="button"
                  onClick={handleClaim}
                  disabled={
                    loadingClaim ||
                    loadingStatus ||
                    !parsedCodeHash.valid ||
                    packet.refunded ||
                    packet.remainingCount === 0 ||
                    (Number(packet.deadline) > 0 &&
                      Math.floor(Date.now() / 1000) >= Number(packet.deadline)) ||
                    !!claimStatus?.hasClaimed
                  }
                  className="bg-fuchsia-500/80 hover:bg-fuchsia-500"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {!account
                    ? "Connect & Claim"
                    : loadingClaim
                      ? "Claiming..."
                      : claimStatus?.hasClaimed
                        ? "Already Claimed"
                        : "Claim Now"}
                </Button>
              </div>

              {!account ? (
                <p className="text-sm text-slate-400">
                  Click claim button and wallet connection will be triggered automatically.
                </p>
              ) : loadingStatus ? (
                <p className="text-sm text-slate-300">Loading my claim status...</p>
              ) : claimStatus?.hasClaimed ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p className="text-emerald-300 font-semibold">You already claimed this packet.</p>
                  <p className="text-slate-300">Amount: <span className="text-white">{formatAmountByToken(claimStatus.amount, claimStatus.token)}</span></p>
                  <p className="text-slate-300 sm:col-span-2 break-all flex items-center gap-1"><User className="w-4 h-4" />Sender: <span className="text-white">{claimStatus.sender}</span></p>
                  <p className="text-slate-300 sm:col-span-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" />Message: <span className="text-white">{claimStatus.message || "-"}</span></p>
                  <p className="text-slate-300 flex items-center gap-1"><Clock3 className="w-4 h-4" />Claimed At: <span className="text-white">{formatUnixTs(claimStatus.claimedAt)}</span></p>
                </div>
              ) : (
                <p className="text-sm text-slate-300">You have not claimed this packet yet.</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-300" />
                <h3 className="text-sm font-semibold text-white">History Claims</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-black/20 text-slate-200 hover:text-white"
                onClick={() => void loadClaimHistory()}
                disabled={!account || loadingHistory}
              >
                {loadingHistory ? "Loading..." : "Refresh"}
              </Button>
            </div>
            {!account ? (
              <p className="text-sm text-slate-400">Connect wallet to view your claim history.</p>
            ) : claimHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No history records yet.</p>
            ) : (
              <div className="space-y-3">
                {claimHistory.map((item) => (
                  <div
                    key={`${item.packetId.toString()}-${item.codeHash}`}
                    className="rounded-lg border border-white/10 p-3"
                  >
                    <p className="text-xs text-slate-400">Packet #{item.packetId.toString()}</p>
                    <p className="text-sm text-white">Amount: {formatAmountByToken(item.amount, item.token)}</p>
                    <p className="text-sm text-white break-all">Sender: {item.sender}</p>
                    <p className="text-sm text-white">Message: {item.message || "-"}</p>
                    <p className="text-xs text-slate-400">Claimed At: {formatUnixTs(item.claimedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
