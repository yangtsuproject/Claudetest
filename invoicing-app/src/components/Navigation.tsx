'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/invoices', label: 'Invoices', icon: '📄' },
  { href: '/expenses', label: 'Expenses', icon: '💰' },
  { href: '/receipts', label: 'Receipts', icon: '🧾' },
  { href: '/bank', label: 'Bank', icon: '🏦' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSyncing, syncError } = useApp();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-slate-900 text-white flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">Akros Digital</h1>
          <p className="text-xs text-slate-400">Invoicing & Expenses</p>
        </div>

        <div className="flex-1 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                pathname === item.href
                  ? 'bg-slate-700 border-r-4 border-blue-500'
                  : 'hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Sync Status */}
        <div className="px-4 py-2 border-t border-slate-700">
          <div className="flex items-center gap-2 text-xs">
            {isSyncing ? (
              <>
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                <span className="text-yellow-400">Syncing...</span>
              </>
            ) : syncError ? (
              <>
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="text-red-400">Offline</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-green-400">Synced</span>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
          UEN: 202540498Z
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center p-2 ${
                pathname === item.href ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center p-2 text-slate-400"
          >
            <span className="text-xl">☰</span>
            <span className="text-xs mt-1">More</span>
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute bottom-16 right-4 bg-slate-800 rounded-lg shadow-xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 z-40 flex justify-between items-center">
        <h1 className="text-lg font-bold">Akros Digital</h1>
        {/* Mobile Sync Status */}
        <div className="flex items-center gap-1 text-xs">
          {isSyncing ? (
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          ) : syncError ? (
            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
          ) : (
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          )}
        </div>
      </header>
    </>
  );
}
