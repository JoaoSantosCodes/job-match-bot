'use client';

import React from 'react';

export interface MatchedJob {
  title: string;
  company: string;
  description: string;
  requirements?: string;
  url: string;
  score: number;
  reason: string;
  matchedAt?: string;
}

interface JobCardProps {
  job: MatchedJob;
}

export default function JobCard({ job }: JobCardProps) {
  const isHighMatch = job.score >= 80;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-slate-700 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between h-full backdrop-blur-sm">
      <div className="space-y-4">
        {/* Header: Score and Company */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              {job.company}
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-1 leading-snug">
              {job.title}
            </h3>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border ${
              isHighMatch
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            {job.score}% Match
          </span>
        </div>

        {/* Reason snippet */}
        <div className="bg-slate-950/40 rounded-xl p-3.5 border border-slate-800/60">
          <p className="text-sm italic text-slate-300 font-medium leading-relaxed">
            &ldquo;{job.reason}&rdquo;
          </p>
        </div>

        {/* Short Description */}
        <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
          {job.description}
        </p>

        {/* Requirements list */}
        {job.requirements && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Key Requirements
            </span>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.split(',').map((req, i) => (
                <span
                  key={i}
                  className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-xs px-2.5 py-1 rounded-md"
                >
                  {req.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {job.matchedAt
            ? `Matched on ${new Date(job.matchedAt).toLocaleDateString()}`
            : 'Recently Matched'}
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300"
        >
          <span>Apply Now</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
