'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import UploadForm from '../components/UploadForm';
import { UserProfile } from '../lib/resume-parser';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit Field Inputs
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSeniority, setEditedSeniority] = useState('');
  const [editedWorkArea, setEditedWorkArea] = useState('');
  const [editedLanguages, setEditedLanguages] = useState('');
  const [editedSkills, setEditedSkills] = useState('');

  const handleUploadSuccess = (sid: string, parsedProfile: UserProfile) => {
    setSessionId(sid);
    setProfile(parsedProfile);
    // Initialize input fields with extracted values
    setEditedTitle(parsedProfile.jobTitle);
    setEditedSeniority(parsedProfile.seniorityLevel);
    setEditedWorkArea(parsedProfile.workArea);
    setEditedLanguages(parsedProfile.languages.join(', '));
    setEditedSkills(parsedProfile.topSkills.join(', '));
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setIsSaving(true);
    setSaveError(null);

    const updatedProfile: UserProfile = {
      jobTitle: editedTitle.trim(),
      seniorityLevel: editedSeniority.trim(),
      workArea: editedWorkArea.trim(),
      languages: editedLanguages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      topSkills: editedSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    };

    try {
      const response = await fetch('/api/upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, profile: updatedProfile })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setProfile(data.profile);
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving the profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    if (!profile) return;
    setEditedTitle(profile.jobTitle);
    setEditedSeniority(profile.seniorityLevel);
    setEditedWorkArea(profile.workArea);
    setEditedLanguages(profile.languages.join(', '));
    setEditedSkills(profile.topSkills.join(', '));
    setIsEditing(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Aesthetic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto space-y-12 z-10 text-center">
        {/* Title / Hero */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-indigo-400 to-violet-400">
            Job Match Bot
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Upload your resume, extract your profile with Gemini, and scan scraping sources for matches sent straight to your Discord.
          </p>
        </div>

        {!profile ? (
          /* Step 1: Upload Form */
          <div className="transition-all duration-500 transform scale-100">
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : (
          /* Step 2: Extracted / Editable Profile Summary */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto text-left space-y-6 shadow-2xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100">
                {isEditing ? 'Edit Profile Details' : 'Extracted Profile Details'}
              </h2>
              <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                {isEditing ? 'Editing Mode' : 'Gemini Extracted'}
              </span>
            </div>

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
                {saveError}
              </div>
            )}

            {isEditing ? (
              /* EDIT MODE VIEW */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-700 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Seniority Level
                    </label>
                    <input
                      type="text"
                      value={editedSeniority}
                      onChange={(e) => setEditedSeniority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-700 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Work Area
                    </label>
                    <input
                      type="text"
                      value={editedWorkArea}
                      onChange={(e) => setEditedWorkArea(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-700 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Languages Spoken (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editedLanguages}
                      onChange={(e) => setEditedLanguages(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-700 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Top Skills (comma separated list)
                  </label>
                  <input
                    type="text"
                    value={editedSkills}
                    onChange={(e) => setEditedSkills(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-700 transition-colors"
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW MODE VIEW */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                      Job Title
                    </span>
                    <span className="text-slate-200 text-base font-semibold mt-1 block">
                      {profile.jobTitle || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                      Seniority Level
                    </span>
                    <span className="text-slate-200 text-base font-semibold mt-1 block">
                      {profile.seniorityLevel || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                      Work Area
                    </span>
                    <span className="text-slate-200 text-base font-semibold mt-1 block">
                      {profile.workArea || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                      Languages Spoken
                    </span>
                    <span className="text-slate-200 text-base font-semibold mt-1 block">
                      {profile.languages?.join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">
                    Top 5 Skills
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.topSkills?.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-semibold px-3.5 py-1.5 rounded-xl"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/dashboard?sessionId=${sessionId}`}
                    className="flex-1 text-center bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2"
                  >
                    <span>Go to Dashboard</span>
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
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                  <button
                    onClick={startEditing}
                    className="sm:w-1/4 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-200 font-medium py-3.5 px-6 rounded-xl transition-all"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfile(null);
                      setSessionId(null);
                    }}
                    className="sm:w-1/4 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-300 font-medium py-3.5 px-6 rounded-xl transition-all"
                  >
                    Re-upload
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
