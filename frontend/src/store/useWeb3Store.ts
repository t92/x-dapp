import { create } from 'zustand';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, formatUnits } from 'ethers';
import { USDC } from '@/contractAddress';

const ETH_DECIMALS = 18;

interface Balance {
  symbol: string;
  balance: string;
  decimals: number;
}

interface Web3State {
  account: string | null;
  balance: Balance[] | null;
  isConnecting: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;

  connectWallet: () => Promise<void>;
  disconnect: () => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  account: null,
  balance: [],
  isConnecting: false,
  provider: null,
  signer: null,

  connectWallet: async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask or another Web3 wallet!");
      return;
    }

    try {
      set({ isConnecting: true });

      // Connect to the MetaMask EIP-1193 object
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request access to write operations
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      // Fetch native ETH balance
      const balanceWei = await provider.getBalance(address);

      const balanceEth = {
        symbol: 'ETH',
        balance: formatUnits(balanceWei, ETH_DECIMALS),
        decimals: ETH_DECIMALS,
      };

      const balances: Balance[] = [balanceEth];

      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ];

      const usdcCode = await provider.getCode(USDC);
      if (usdcCode !== "0x") {
        try {
          const token = new Contract(USDC, erc20Abi, provider);
          const [rawBalance, decimals, symbol] = await Promise.all([
            token.balanceOf(address),
            token.decimals(),
            token.symbol(),
          ]);
          balances.push({
            symbol,
            balance: formatUnits(rawBalance, decimals),
            decimals,
          });
        } catch (tokenError) {
          console.warn("USDC contract read failed, fallback to ETH only", tokenError);
        }
      }

      // Save globally
      set({
        account: address,
        balance: balances,
        provider,
        signer,
      });

    } catch (error) {
      console.error("User rejected request or error occurred", error);
    } finally {
      set({ isConnecting: false });
    }
  },

  disconnect: () => {
    set({
      account: null,
      balance: null,
      provider: null,
      signer: null
    });
  }
}));
