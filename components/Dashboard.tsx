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
  const [activeTab, setActiveTab] = useState<'matches' | 'applied' | 'dismissed' | 'coaching'>('matches');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | 'remote' | 'hybrid' | 'on-site'>('all');
  const [citySearch, setCitySearch] = useState('');

  // Coaching State
  const [coachingReport, setCoachingReport] = useState<any | null>(null);
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);

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

  // Fetch coaching report when tab becomes active
  useEffect(() => {
    async function fetchCoachingReport() {
      if (!sessionId || coachingReport) return;
      setIsCoachingLoading(true);
      setCoachingError(null);
      try {
        const res = await fetch(`/api/coaching?sessionId=${sessionId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Server error: ${res.status}`);
        }
        setCoachingReport(data.report);
      } catch (err: any) {
        setCoachingError(err.message || 'Falha ao carregar feedback de carreira.');
      } finally {
        setIsCoachingLoading(false);
      }
    }

    if (activeTab === 'coaching') {
      fetchCoachingReport();
    }
  }, [activeTab, sessionId, coachingReport]);

  const handleRecalculateCoaching = async () => {
    if (!sessionId) return;
    setIsCoachingLoading(true);
    setCoachingError(null);
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao recalcular análise.');
      }
      setCoachingReport(data.report);
    } catch (err: any) {
      setCoachingError(err.message || 'Erro ao recalcular feedback de carreira.');
    } finally {
      setIsCoachingLoading(false);
    }
  };

  // Apply filters whenever jobs, scoreFilter, searchQuery, workplaceFilter, citySearch, or activeTab changes
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

    // Filter by workplace type
    if (workplaceFilter !== 'all') {
      result = result.filter((job) => {
        if (job.workplaceType === workplaceFilter) return true;
        // Fallback checks for legacy data or loose mapping
        const jobLoc = (job.location || '').toLowerCase();
        if (workplaceFilter === 'remote' && (jobLoc.includes('remote') || jobLoc.includes('remoto'))) return true;
        if (workplaceFilter === 'hybrid' && (jobLoc.includes('hybrid') || jobLoc.includes('híbrid'))) return true;
        if (workplaceFilter === 'on-site' && !jobLoc.includes('remote') && !jobLoc.includes('remoto') && !jobLoc.includes('hybrid') && !jobLoc.includes('híbrid')) return true;
        return false;
      });
    }

    // Filter by city search query
    if (citySearch.trim()) {
      const cityQuery = citySearch.toLowerCase();
      result = result.filter((job) => {
        const jobLoc = (job.location || '').toLowerCase();
        // Skip "remote/remoto" string matches unless the user explicitly searches for "remot"
        if (jobLoc.includes('remote') || jobLoc.includes('remoto')) {
          return cityQuery.includes('remot');
        }
        return jobLoc.includes(cityQuery);
      });
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
  }, [jobs, scoreFilter, searchQuery, workplaceFilter, citySearch, activeTab]);

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

  const renderCoachingView = () => {
    if (isCoachingLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <svg
            className="animate-spin h-8 w-8 text-violet-500"
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
          <p className="text-slate-400 text-sm">O Gemini está analisando seus gaps e preparando o feedback de carreira...</p>
        </div>
      );
    }

    if (coachingError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-6 text-center max-w-xl mx-auto my-10 space-y-4">
          <p className="font-semibold">Erro ao Gerar Coaching</p>
          <p className="text-sm">{coachingError}</p>
          <button
            onClick={handleRecalculateCoaching}
            className="bg-red-500/20 border border-red-500/35 text-red-400 hover:bg-red-500/35 text-xs px-4 py-2 rounded-xl transition-all font-semibold"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    if (!coachingReport) {
      return (
        <div className="text-center py-20 bg-slate-950/20 border border-slate-900 border-dashed rounded-3xl space-y-4">
          <p className="text-slate-400 text-lg font-medium">Nenhum feedback gerado.</p>
          <button
            onClick={handleRecalculateCoaching}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all"
          >
            Analisar meu Currículo
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Coaching Header */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <span>💡 IA Career Coaching & Feedback</span>
            </h2>
            <p className="text-sm text-slate-400">
              Análise personalizada baseada no seu currículo e nos requisitos das {jobs.length} vagas capturadas.
            </p>
          </div>
          <button
            onClick={handleRecalculateCoaching}
            className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shrink-0 border border-slate-750"
          >
            <span>🔄 Recalcular Análise</span>
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Skill Gaps & Tips */}
          <div className="space-y-8">
            {/* Gaps de Habilidades */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>⚠️ Gaps de Tecnologias Identificados</span>
              </h3>
              <div className="space-y-4">
                {coachingReport.skillsGaps?.length > 0 ? (
                  coachingReport.skillsGaps.map((gap: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-200">{gap.skill}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold tracking-wider uppercase border ${
                          gap.urgency === 'Alta'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : gap.urgency === 'Média'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                          Prioridade {gap.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{gap.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Parabéns! Nenhuma lacuna de competência crítica encontrada.</p>
                )}
              </div>
            </div>

            {/* Dicas de Currículo */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3">
                📝 Dicas para Otimizar o seu Currículo (PDF)
              </h3>
              <ul className="space-y-3">
                {coachingReport.resumeTips?.map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-3 text-xs leading-relaxed text-slate-300">
                    <span className="text-emerald-500 shrink-0 select-none text-sm">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Certifications & Courses */}
          <div className="space-y-8">
            {/* Certificações Sugeridas */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🏆 Certificações Recomendadas</span>
              </h3>
              <div className="space-y-4">
                {coachingReport.certifications?.length > 0 ? (
                  coachingReport.certifications.map((cert: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-200 leading-snug">{cert.name}</span>
                        <span className="bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md text-3xs font-extrabold uppercase shrink-0">
                          {cert.provider}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{cert.benefit}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhuma certificação específica listada.</p>
                )}
              </div>
            </div>

            {/* Cursos Recomendados */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>📚 Cursos & Trilhas Sugeridos</span>
              </h3>
              <div className="space-y-4">
                {coachingReport.recommendedCourses?.length > 0 ? (
                  coachingReport.recommendedCourses.map((course: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-200 leading-snug">{course.name}</h4>
                        <div className="flex items-center space-x-2 text-3xs font-semibold text-slate-500">
                          <span>Plataforma: <strong className="text-slate-400">{course.platform}</strong></span>
                          <span>•</span>
                          <span>Duração: <strong className="text-slate-400">{course.duration}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum curso específico recomendado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

          <button
            onClick={() => setActiveTab('coaching')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all relative ${
              activeTab === 'coaching'
                ? 'border-violet-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Feedback & Coaching</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-2xs bg-violet-500/20 text-violet-400 font-extrabold uppercase tracking-wide">
              IA
            </span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      {activeTab !== 'coaching' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          {/* First Row: Search inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Main Keyword Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search title, company, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-slate-700 transition-colors"
              />
              <svg
                className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500"
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

            {/* City / Location Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by city or region (e.g. São Paulo)..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-slate-700 transition-colors"
              />
              <span className="absolute left-3.5 top-2.5 text-base">📍</span>
            </div>
          </div>

          {/* Second Row: Filter Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-800/40">
            {/* Match Level */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
                Match Level:
              </span>
              <button
                onClick={() => setScoreFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  scoreFilter === 'all'
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                All Matches
              </button>
              <button
                onClick={() => setScoreFilter('high')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  scoreFilter === 'high'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                High Fit (≥80%)
              </button>
              <button
                onClick={() => setScoreFilter('medium')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  scoreFilter === 'medium'
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Mid Fit (70-79%)
              </button>
            </div>

            {/* Workplace Type */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
                Workplace:
              </span>
              <button
                onClick={() => setWorkplaceFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  workplaceFilter === 'all'
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Any
              </button>
              <button
                onClick={() => setWorkplaceFilter('remote')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  workplaceFilter === 'remote'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Remote
              </button>
              <button
                onClick={() => setWorkplaceFilter('hybrid')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  workplaceFilter === 'hybrid'
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Hybrid
              </button>
              <button
                onClick={() => setWorkplaceFilter('on-site')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  workplaceFilter === 'on-site'
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                On-site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Coaching View or Jobs Grid */}
      {activeTab === 'coaching' ? (
        renderCoachingView()
      ) : filteredJobs.length > 0 ? (
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
