import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product, ApiResponse } from "@/types";
import { useWeb3Store } from "@/store/useWeb3Store";

type PurchaseRecordsDialogProps = {
  open: boolean;
  onClose: () => void;
};



export default function PurchaseRecordsDialog({ open, onClose }: PurchaseRecordsDialogProps) {
  if (!open) return null;
  const [records, setRecords] = useState<Product[]>([]);
  const { account } = useWeb3Store()


  const loadRecords = useCallback(async () => {
    if (!account) return;
    const res: ApiResponse<Product[]> = await fetch(`${process.env.BASE_URL}/get_orders?address=${account}`)
      .then(_ => _.json())
    if (res.code === 200) {
      setRecords(res.data || [])
    }
  }, [account]);

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Purchase Records</h3>
            <p className="mt-1 text-sm text-slate-400">Recent orders and transaction status (sample data)</p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-white/10 text-slate-200">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{record.id}</td>
                  <td className="px-4 py-3">{record.name}</td>
                  <td className="px-4 py-3 text-emerald-400">{record.price}</td>
                  <td className="px-4 py-3 text-slate-300">{record.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
