"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import TransferTab from "@/components/TransferTab";
import RedPacketTab from "@/components/RedPacketTab";
import ShopTab from "@/components/ShopTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Gift, ShoppingBag } from "lucide-react";

const TAB_VALUES = ["transfer", "redpacket", "shop"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function resolveTab(tab: string | null): TabValue {
  return TAB_VALUES.includes(tab as TabValue) ? (tab as TabValue) : "transfer";
}

export default function Home() {
  const searchParams = useSearchParams();
  const tabFromQuery = useMemo(() => resolveTab(searchParams.get("tab")), [searchParams]);
  const [activeTab, setActiveTab] = useState<TabValue>(tabFromQuery);

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  return (
    <div className="min-h-screen animated-gradient-bg relative text-slate-50 overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse delay-700"></div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-12 flex flex-col items-center">
        {/* Header */}
        <Header />


        {/* Main Content Area */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 rounded-3xl p-1.5 w-full flex overflow-x-auto no-scrollbar gap-2 mb-8 self-center max-w-2xl mx-auto h-auto">
              <TabsTrigger
                value="transfer"
                className="flex-1 h-14 min-w-[140px] flex items-center justify-center gap-2 px-4 rounded-2xl transition-all font-medium text-sm data-[state=active]:bg-indigo-500/80 data-[state=active]:text-white text-slate-400"
              >
                <Send className="w-4 h-4" />
                Transfer Assets
              </TabsTrigger>
              <TabsTrigger
                value="redpacket"
                className="flex-1 h-14 min-w-[140px] flex items-center justify-center gap-2 px-4 rounded-2xl transition-all font-medium text-sm data-[state=active]:bg-fuchsia-500/80 data-[state=active]:text-white text-slate-400"
              >
                <Gift className="w-4 h-4" />
                Send Red Packet
              </TabsTrigger>
              <TabsTrigger
                value="shop"
                className="flex-1 h-14 min-w-[140px] flex items-center justify-center gap-2 px-4 rounded-2xl transition-all font-medium text-sm data-[state=active]:bg-emerald-500/80 data-[state=active]:text-white text-slate-400"
              >
                <ShoppingBag className="w-4 h-4" />
                DApp Store
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transfer" className="glass-panel rounded-3xl p-8 animate-fade-in">
              <TransferTab />
            </TabsContent>

            <TabsContent value="redpacket" className="glass-panel rounded-3xl p-8 animate-fade-in">
              <RedPacketTab />
            </TabsContent>

            <TabsContent value="shop" className="glass-panel rounded-3xl p-8 animate-fade-in">
              <ShopTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
