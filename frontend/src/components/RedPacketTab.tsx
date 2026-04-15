import React, { useState } from "react";
import { Gift, Package } from "lucide-react";
import AssetSelector from "./AssetSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeb3Store } from "@/store/useWeb3Store";
import { ZeroAddress, parseEther, parseUnits, Contract, isAddress } from "ethers";
import { useForm, useWatch } from "react-hook-form";
import { toast } from 'sonner'
import { RED_PACKET } from "@/contractAddress";

type PacketType = 'random' | 'equal'

interface RedPacketForm {
  packetType: PacketType;
  token: string;
  count: string;
  message: string;
  totalAmount: string;
}

const toastOption = {
  position: 'top-center' as const,
  className: 'bg-black/50 border-white/10 text-white',
}

function getReadableError(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown error";
  const e = error as Record<string, unknown>;
  const shortMessage = e.shortMessage;
  if (typeof shortMessage === "string" && shortMessage.trim()) return shortMessage;
  const reason = e.reason;
  if (typeof reason === "string" && reason.trim()) return reason;
  const message = e.message;
  if (typeof message === "string" && message.trim()) return message;
  return "Unknown error";
}

export default function RedPacketTab() {
  const { signer, balance } = useWeb3Store();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RedPacketForm>({
    defaultValues: {
      packetType: "random",
      token: ZeroAddress,
      totalAmount: "",
      count: "",
      message: "Happy Holidays!",
    },
  });

  const packetType = useWatch({ control, name: "packetType" });
  const [cionSymbol, setCionSymbol] = useState<string>('ETH')
  const [isCreating, setIsCreating] = useState(false);
  const [createdClaimLink, setCreatedClaimLink] = useState<string>("");

  const redPacketAbi = [
    "event PacketCreated(uint256 indexed packetId, address indexed sender, address indexed token, uint256 totalAmount, uint32 count, uint64 deadline, uint8 packetType, bytes32 codeHash)",
    "function createRedPacket(address token, uint256 totalAmount, uint32 count, uint8 packetType, string message) payable returns (uint256 packetId, bytes32 codeHash)",
    "function nextPacketId() view returns (uint256)",
  ];
  const erc20Abi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
  ];

  const handleSend = async (formData: RedPacketForm) => {
    if (!RED_PACKET || !isAddress(RED_PACKET)) {
      toast.error("Please configure RED_PACKET contract address", toastOption);
      return;
    }

    if (!signer) {
      toast.error("Please connect wallet", toastOption)
      return;
    }
    if (!signer.provider) {
      toast.error("Wallet provider unavailable", toastOption);
      return;
    }

    const cion = balance?.find(_ => _.symbol === cionSymbol);
    const decimals = cionSymbol === "ETH" ? 18 : cion?.decimals;
    if (decimals === undefined) {
      toast.error("Token decimals not found", toastOption);
      return;
    }

    const payload = {
      ...formData,
      totalAmount: cionSymbol === 'ETH' ? parseEther(formData.totalAmount) : parseUnits(formData.totalAmount, decimals),
      count: Number(formData.count),
      packetType: formData.packetType === "equal" ? 1 : 0,
    };

    if (payload.count > 0xffffffff) {
      toast.error("Packet count is too large", toastOption);
      return;
    }

    try {
      setIsCreating(true);
      const contract = new Contract(RED_PACKET, redPacketAbi, signer);
      const code = await signer.provider.getCode(RED_PACKET);
      if (code === "0x") {
        toast.error("RED_PACKET is not deployed on current network", toastOption);
        return;
      }
      try {
        await contract.nextPacketId();
      } catch {
        toast.error("Contract ABI/address mismatch on current network", toastOption);
        return;
      }
      if (payload.token !== ZeroAddress) {
        const owner = await signer.getAddress();
        const tokenContract = new Contract(payload.token, erc20Abi, signer);
        const allowance = (await tokenContract.allowance(owner, RED_PACKET)) as bigint;
        if (allowance < payload.totalAmount) {
          toast.info("Approving token...", toastOption);
          const approveTx = await tokenContract.approve(RED_PACKET, payload.totalAmount);
          await approveTx.wait();
        }
      }

      const tx =
        payload.token === ZeroAddress
          ? await contract.createRedPacket(
              payload.token,
              payload.totalAmount,
              payload.count,
              payload.packetType,
              payload.message,
              { value: payload.totalAmount }
            )
          : await contract.createRedPacket(
              payload.token,
              payload.totalAmount,
              payload.count,
              payload.packetType,
              payload.message
            );
      const receipt = await tx.wait();
      if (!receipt || Number(receipt.status) !== 1) {
        toast.error("Create transaction failed", toastOption);
        return;
      }

      let packetId: bigint | null = null;
      let codeHash: string | null = null;

      if (receipt) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === "PacketCreated") {
              packetId = parsed.args.packetId;
              codeHash = parsed.args.codeHash;
              break;
            }
          } catch {
            // skip non-contract logs
          }
        }
      }

      if (packetId === null || !codeHash) {
        throw new Error(`PacketCreated event missing in receipt logs. txHash=${receipt.hash}`);
      }

      const claimLink = `${window.location.origin}/claim?codeHash=${codeHash}`;
      setCreatedClaimLink(claimLink);
      try {
        await navigator.clipboard.writeText(claimLink);
        toast.success(`Packet #${packetId.toString()} created. Claim link copied.`, toastOption);
      } catch {
        toast.success(`Packet #${packetId.toString()} created. Link: ${claimLink}`, toastOption);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Create failed: ${getReadableError(error)}`, toastOption);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssetSelect = (value: string, symbol: string) => {
    setValue("token", value, { shouldValidate: true });
    setCionSymbol(symbol)
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-fuchsia-500/30">
          <Gift className="w-8 h-8 text-fuchsia-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">Create Red Packet</h2>
        <p className="text-slate-400 text-sm">Distribute crypto to your community randomly or equally!</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(handleSend)}>
        <input type="hidden" {...register("packetType")} />
        <input type="hidden" {...register("token")} />

        {/* Asset Selector */}
        <AssetSelector label="Select Asset" onSelect={handleAssetSelect} />

        {/* Packet Type */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-300 ml-1">Packet Type</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={packetType === "random" ? "default" : "outline"}
              onClick={() => setValue("packetType", "random", { shouldValidate: true })}
              className={`flex-1 h-14 rounded-xl text-sm font-semibold transition-all stretch ${packetType === "random" ? "bg-fuchsia-500/30 border-fuchsia-500/50 hover:bg-fuchsia-500/40 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]" : "bg-black/20 border-white/10 text-slate-400 hover:text-white"}`}
            >
              Random Amount
            </Button>
            <Button
              type="button"
              variant={packetType === "equal" ? "default" : "outline"}
              onClick={() => setValue("packetType", "equal", { shouldValidate: true })}
              className={`flex-1 h-14 rounded-xl text-sm font-semibold transition-all stretch ${packetType === "equal" ? "bg-fuchsia-500/30 border-fuchsia-500/50 hover:bg-fuchsia-500/40 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)]" : "bg-black/20 border-white/10 text-slate-400 hover:text-white"}`}
            >
              Equal Amount
            </Button>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-3 relative">
          <Label htmlFor="totalAmount" className="text-xs font-semibold text-slate-300 ml-1">Total Amount</Label>
          <Input
            id="totalAmount"
            type="number"
            step='any'
            placeholder="0.00"
            {...register("totalAmount", {
              required: "Please enter total amount",
              validate: {
                insufficientBalance: value => {
                  const item = balance?.find(_ => _.symbol === cionSymbol)
                  if (Number(value) > Number(item?.balance)) {
                    toast.error("Insufficient balance", toastOption)
                    return false
                  }
                  return true
                }
              }
            })}
            className="w-full bg-black/30 border-white/10 rounded-xl p-6 text-white focus-visible:ring-fuchsia-500 h-14"
          />
          {errors.totalAmount && (
            <p className="text-xs text-red-400 ml-1">{errors.totalAmount.message}</p>
          )}
        </div>

        {/* Number of Packets */}
        <div className="space-y-3">
          <Label htmlFor="numPackets" className="text-xs font-semibold text-slate-300 ml-1">Number of Packets</Label>
          <Input
            id="numPackets"
            type="number"
            placeholder="10"
            {...register("count", {
              required: "Please enter packet count",
              validate: (value) => Number(value) > 0 || "Packet count must be greater than 0",
            })}
            className="w-full bg-black/30 border-white/10 rounded-xl p-6 text-white focus-visible:ring-fuchsia-500 h-14"
          />
          {errors.count && (
            <p className="text-xs text-red-400 ml-1">{errors.count.message}</p>
          )}
        </div>

        {/* Greeting Message */}
        <div className="space-y-3">
          <Label htmlFor="greeting" className="text-xs font-semibold text-slate-300 ml-1">Greeting Message</Label>
          <Input
            id="greeting"
            type="text"
            placeholder="Best wishes!"
            {...register("message")}
            className="w-full bg-black/30 border-white/10 rounded-xl p-6 text-white focus-visible:ring-fuchsia-500 h-14"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isCreating}
          className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold h-14 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] transition-all flex items-center justify-center -mt-2 group border-0 text-lg"
        >
          <Package className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          {isCreating ? "Creating..." : "Wrap & Send"}
        </Button>

        {!!createdClaimLink && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-3">
            <p className="text-sm text-emerald-300 font-semibold">领取链接已生成</p>
            <p className="text-xs text-slate-200 break-all">{createdClaimLink}</p>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-300/40 bg-black/20 text-emerald-200 hover:text-emerald-100"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(createdClaimLink);
                  toast.success("Claim link copied", toastOption);
                } catch {
                  toast.error("Copy failed", toastOption);
                }
              }}
            >
              复制领取链接
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
