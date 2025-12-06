'use client';

import { Suspense } from 'react';
import Invoices from "@/components/Invoices";

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
      <Invoices />
    </Suspense>
  );
}
