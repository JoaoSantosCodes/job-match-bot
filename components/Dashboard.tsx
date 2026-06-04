'use client';

import React, { useState, useEffect } from 'react';
import JobCard, { MatchedJob } from './JobCard';

interface DashboardProps {
  sessionId: string;
}

export default function Dashboard({ sessionId }: DashboardProps) {
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<MatchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status and Filter States
  const [activeTab, setActiveTab] = useState<'matches' | 'applied' | 'dismissed'>('matches');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchJobs() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobs?sessionId=${sessionId}`);
        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        }

        if (!res.ok) {
          throw new Error((data && data.error) || `Server error: ${res.status} ${res.statusText}`);
        }

        if (!data) {
          throw new Error('Received an empty response from server.');
        }

        setJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading jobs.');
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionId) {
      fetchJobs();
    }
  }, [sessionId]);

  // Apply filters whenever jobs, scoreFilter, searchQuery, or activeTab changes
  useEffect(() => {
    let result = [...jobs];

    // Filter by status tab
    if (activeTab === 'matches') {
      result = result.filter((job) => !job.status || job.status === 'active');
    } else if (activeTab === 'applied') {
      result = result.filter((job) => job.status === 'applied');
    } else if (activeTab === 'dismissed') {
      result = result.filter((job) => job.status === 'dismissed');
    }

    // Filter by score
    if (scoreFilter === 'high') {
      result = result.filter((job) => job.score >= 80);
    } else if (scoreFilter === 'medium') {
      result = result.filter((job) => job.score >= 70 && job.score < 80);
    }

    // Filter by search query (title, company, description, or requirements)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          (job.requirements && job.requirements.toLowerCase().includes(query))
      );
    }

    setFilteredJobs(result);
  }, [jobs, scoreFilter, searchQuery, activeTab]);

  // Handle status update and sync to Redis
  const handleStatusChange = async (jobUrl: string, newStatus: 'active' | 'applied' | 'dismissed') => {
    const updatedJobs = jobs.map((job) => {
      if (job.url === jobUrl) {
        return { ...job, status: newStatus };
      }
      return job;
    });

    // Optimistically update frontend state
    setJobs(updatedJobs);

    // Sync to Redis
    try {
      await fetch('/api/jobs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          jobs: updatedJobs
        })
      });
    } catch (err) {
      console.error('Failed to sync job status updates to server:', err);
    }
  };

  const activeCount = jobs.filter((j) => !j.status || j.status === 'active').length;
  const appliedCount = jobs.filter((j) => j.status === 'applied').length;
  const dismissedCount = jobs.filter((j) => j.status === 'dismissed').length;

  if (isLoading) {
    return (
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
        <p className="text-slate-400 text-sm">Searching Vercel KV for match history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-6 text-center max-w-xl mx-auto my-10">
        <p className="font-semibold">Error Loading Jobs</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Board Navigation Tabs */}
      <div className="flex border-b border-slate-800 pb-px">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all relative ${
              activeTab === 'matches'
                ? 'border-indigo-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Vagas Recomendadas</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'matches' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500'
            }`}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('applied')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all relative ${
              activeTab === 'applied'
                ? 'border-emerald-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Candidatadas</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'applied' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-500'
            }`}>
              {appliedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dismissed')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all relative ${
              activeTab === 'dismissed'
                ? 'border-red-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Descartadas</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'dismissed' ? 'bg-red-500/20 text-red-400' : 'bg-slate-900 text-slate-500'
            }`}>
              {dismissedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search title, company, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-slate-700 transition-colors"
          />
          <svg
            className="absolute left-3.5 top-3 w-4 h-4 text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
            />
          </svg>
        </div>

        {/* Score filter buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
            Match Level:
          </span>
          <button
            onClick={() => setScoreFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              scoreFilter === 'all'
                ? 'bg-indigo-500 border-indigo-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            All Matches
          </button>
          <button
            onClick={() => setScoreFilter('high')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              scoreFilter === 'high'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            High Fit (≥80%)
          </button>
          <button
            onClick={() => setScoreFilter('medium')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              scoreFilter === 'medium'
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            Mid Fit (70-79%)
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job, idx) => (
            <JobCard 
              key={idx} 
              job={job} 
              onStatusChange={(newStatus) => handleStatusChange(job.url, newStatus)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-950/20 border border-slate-900 border-dashed rounded-3xl">
          <svg
            className="mx-auto w-12 h-12 text-slate-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.375c1.08 0 2.025-.5 2.707-1.226M10.875 18.75h.375M3.75 18.75h16.5M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
            />
          </svg>
          <p className="text-slate-400 text-lg font-medium mt-4">
            {activeTab === 'matches'
              ? 'No matching jobs found'
              : activeTab === 'applied'
              ? 'No applied applications yet'
              : 'No dismissed listings'}
          </p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            {jobs.length === 0
              ? "We haven't run the scraper cron yet, or there are no matched postings. Try triggering the cron scheduler."
              : activeTab === 'matches'
              ? 'Try relaxing your filter parameters or checking your spelling.'
              : activeTab === 'applied'
              ? 'Click "Marcar Candidatado" on any recommended job card to track your applications here.'
              : 'Archive recommended jobs you are not interested in, and they will show up here.'}
          </p>
        </div>
      )}
    </div>
  );
}
