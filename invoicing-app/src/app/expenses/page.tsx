'use client';

import { Suspense } from 'react';
import Expenses from "@/components/Expenses";

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
      <Expenses />
    </Suspense>
  );
}
