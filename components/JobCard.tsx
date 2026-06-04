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
  status?: 'active' | 'applied' | 'dismissed';
  location?: string;
  workplaceType?: string;
}

interface JobCardProps {
  job: MatchedJob;
  onStatusChange: (newStatus: 'active' | 'applied' | 'dismissed') => void;
}

export default function JobCard({ job, onStatusChange }: JobCardProps) {
  const isHighMatch = job.score >= 80;
  const isApplied = job.status === 'applied';
  const isDismissed = job.status === 'dismissed';

  return (
    <div 
      className={`border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl flex flex-col justify-between h-full backdrop-blur-sm relative ${
        isApplied
          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/5'
          : isDismissed
          ? 'bg-slate-950/30 border-slate-900/80 opacity-60 hover:opacity-85 hover:border-slate-800'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:shadow-indigo-500/5'
      }`}
    >
      <div className="space-y-4">
        {/* Header: Score, Company and Dismiss button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              {job.company}
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-1 leading-snug">
              {job.title}
            </h3>
            
            {/* Location Tag */}
            {job.location && (
              <div className="flex items-center space-x-1.5 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  job.workplaceType === 'remote'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : job.workplaceType === 'hybrid'
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300'
                }`}>
                  <span className="mr-1">{job.workplaceType === 'remote' ? '🌐' : '📍'}</span>
                  {job.location}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border ${
                isHighMatch
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              {job.score}% Match
            </span>
            
            {/* Dismiss / Restore Button */}
            {!isDismissed ? (
              <button
                onClick={() => onStatusChange('dismissed')}
                title="Descartar vaga"
                className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onStatusChange('active')}
                title="Restaurar vaga"
                className="text-slate-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
            )}
          </div>
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
      <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
        {/* Applied status Toggle */}
        {!isDismissed ? (
          !isApplied ? (
            <button
              onClick={() => onStatusChange('applied')}
              className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-emerald-400 text-xs font-semibold py-2 px-3 rounded-xl hover:bg-slate-800/50 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Marcar Candidatado</span>
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('active')}
              className="inline-flex items-center space-x-1.5 text-emerald-400 hover:text-amber-400 text-xs font-semibold py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Candidatado ✓</span>
            </button>
          )
        ) : (
          <span className="text-xs text-slate-500 italic">Descartada</span>
        )}

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all duration-300 shrink-0"
        >
          <span>Apply Now</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3.5 h-3.5"
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
