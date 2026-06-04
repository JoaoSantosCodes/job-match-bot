'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Dashboard from '../../components/Dashboard';

function DashboardContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return (
      <div className="text-center py-20 max-w-xl mx-auto space-y-6">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-full inline-block text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-200">No Active Session Found</h2>
        <p className="text-slate-400">
          Please go back to the home page and upload your resume to analyze your profile first.
        </p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-md shadow-indigo-500/10"
        >
          Go to Home Page
        </Link>
      </div>
    );
  }

  return <Dashboard sessionId={sessionId} />;
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              Matched Job Listings
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time job offers matched against your resume by Gemini AI
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors bg-slate-900 border border-slate-800 py-2.5 px-4.5 rounded-xl hover:bg-slate-850"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span>Upload New Resume</span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <svg
                className="animate-spin h-8 w-8 text-indigo-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-slate-400 text-sm">Loading dashboard content...</p>
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
