
import { Send } from "lucide-react";
import AssetSelector from "./AssetSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeb3Store } from "@/store/useWeb3Store";
import { useForm } from "react-hook-form";
import { ZeroAddress, parseEther, parseUnits } from "ethers";
import { TRANSFORM } from "@/contractAddress";
import { IERC20__factory, Transform__factory } from "@/typechain-types";
import { useState } from "react";
import { toast } from "sonner";


const toastOption = {
  position: 'top-center' as const,
  className: 'bg-black/50 border-white/10 text-white',
}

type TxPhase =
  | "idle"          // 默认可点击
  | "validating"    // 校验参数/钱包
  | "approving"     // ERC20 授权中
  | "signing"       // 钱包签名弹窗中（transfer tx）
  | "submitting"    // 已发出，等待节点接受
  | "confirming"    // 等待链上确认

type TransferFormState = Record<TxPhase, string>

const TxPhaseLabel: TransferFormState = {
  idle: "Confirm Transfer",
  validating: "Validating...",
  approving: "Approving...",
  signing: "Signing...",
  submitting: "Submitting...",
  confirming: "Confirming..."
}




export default function TransferTab() {
  const { account, signer, connectWallet } = useWeb3Store();
  const [symbol, setSymbol] = useState<string>('ETH');
  const [btnStatus, setBtnStatus] = useState<TxPhase>('idle');

  interface TransferFormType {
    from: string;
    to: string;
    amount: string;
    token: string;
  }

  const { register, handleSubmit, setValue } = useForm<TransferFormType>({
    defaultValues: {
      from: account ?? "",
      to: "",
      amount: "",
      token: ZeroAddress,
    },
  });

  const handleSelect = (token: string, symbol: string) => {
    setValue("token", token);
    setSymbol(symbol);
  }

  const handleSend = async (formData: TransferFormType) => {
    if (!account || !signer) {
      await connectWallet()
      return
    }

    // 链接合约
    const transformContract = Transform__factory.connect(TRANSFORM, signer);
    setBtnStatus('validating');
    if (symbol === "ETH") {
      const amount = parseEther(formData.amount);
      const tx = await transformContract.transfer(ZeroAddress, formData.to, amount, {
        value: amount,
      });
      // 3) 等待交易上链确认
      setBtnStatus('confirming')
      await tx.wait();
    } else {
      // 1) 连接目标 ERC20 代币合约（TypeChain 强类型）
      const token = IERC20__factory.connect(formData.token, signer);
      // 2) 读取代币 decimals，用于把输入金额转换成最小单位
      const decimals: bigint = await token.decimals();
      // 3) 把用户输入金额按 decimals 转换为链上整数
      const amount = parseUnits(formData.amount, Number(decimals));
      setBtnStatus('approving');
      // 4) 查询当前账户给 Transform 合约的授权额度
      const allowance: bigint = await token.allowance(account, TRANSFORM);
      if (allowance < amount) {
        // 5) 授权不足则先发起 approve，让 Transform 能代扣本次金额
        const approveTx = await token.approve(TRANSFORM, amount);
        // 6) 等待授权交易确认
        await approveTx.wait();
      }
      setBtnStatus('signing');
      // 7) 调用 Transform 合约执行 ERC20 转账（合约内部会 transferFrom + transfer）
      const tx = await transformContract.transfer(formData.token, formData.to, amount);
      setBtnStatus('submitting');
      // 8) 等待转账交易确认
      await tx.wait();
    }
    toast.success("Transfer success", toastOption);
    setBtnStatus('idle');
    await connectWallet()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-white">Send Crypto</h2>
        <p className="text-slate-400 text-sm">Instantly transfer assets to any wallet address</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(handleSend)}>
        <AssetSelector label="Asset" onSelect={handleSelect} />

        <div className="space-y-3">
          <Label htmlFor="address" className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
            Recipient Address
          </Label>
          <Input
            id="address"
            type="text"
            placeholder="0x..."
            {...register('to', {
              required: "Address is required",
            })}
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
              type="text"
              placeholder="0.00"
              {...register("amount", {
                required: "Amount is required",
              })}
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
          type="submit"
          size="lg"
          disabled={!account || !signer || btnStatus !== 'idle'}
          className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-lg h-14 rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2 border-0"
        >
          <Send className="w-5 h-5 mr-2" />
          {btnStatus === 'idle' ? (!account || !signer ? "Connect Wallet First" : "Confirm Transfer") : TxPhaseLabel[btnStatus]}
        </Button>
        {!account || !signer ? (
          <p className="text-xs text-slate-400">Connect wallet to enable transfer form submission.</p>
        ) : null}
      </form>
    </div>
  );
}
