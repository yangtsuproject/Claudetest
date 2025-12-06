'use client';

import { Suspense } from 'react';
import Receipts from "@/components/Receipts";

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
      <Receipts />
    </Suspense>
  );
}
