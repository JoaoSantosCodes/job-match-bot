'use client';

import React, { useState, ChangeEvent } from 'react';
import { UserProfile } from '../lib/resume-parser';

interface UploadFormProps {
  onUploadSuccess: (sessionId: string, profile: UserProfile) => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadStep(1); // Step 1: Read PDF layout and check signatures
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    // Simulated timeouts to transition steps visually during the single HTTP request
    const stepTimer1 = setTimeout(() => setUploadStep(2), 1000); // 1.0s: Transition to Gemini AI
    const stepTimer2 = setTimeout(() => setUploadStep(3), 3500); // 3.5s: Transition to Vercel KV save

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        let errorMsg = (data && data.error) || `Server error: ${response.status} ${response.statusText}`;
        if (data && data.cause) {
          errorMsg += ` (Cause: ${data.cause})`;
        }
        if (data && data.details) {
          console.error('Server-side stack trace:', data.details);
        }
        throw new Error(errorMsg);
      }

      if (!data) {
        throw new Error('Received an empty response from server.');
      }

      setUploadStep(4); // Success step
      await new Promise((resolve) => setTimeout(resolve, 600)); // Short pause for visual confirmation

      onUploadSuccess(data.sessionId, data.profile);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setUploadStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center space-y-4"
          >
            <div className="p-4 bg-slate-800 rounded-full text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-slate-200">
                {file ? file.name : 'Drag and drop your PDF resume here'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'or click to browse from files (PDF only)'}
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3.5 text-left animate-fade-in">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 pb-2">
              Resume Processing pipeline
            </h4>
            
            <div className="space-y-3 text-sm">
              {/* Step 1 */}
              <div className="flex items-center space-x-3">
                {uploadStep > 1 ? (
                  <span className="text-emerald-400 font-bold text-base">✓</span>
                ) : uploadStep === 1 ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                ) : (
                  <span className="text-slate-700">○</span>
                )}
                <span
                  className={
                    uploadStep === 1
                      ? 'text-slate-100 font-semibold'
                      : uploadStep > 1
                      ? 'text-slate-500 line-through'
                      : 'text-slate-600'
                  }
                >
                  1. Checking PDF layout & file signatures
                </span>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-center space-x-3">
                {uploadStep > 2 ? (
                  <span className="text-emerald-400 font-bold text-base">✓</span>
                ) : uploadStep === 2 ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                ) : (
                  <span className="text-slate-700">○</span>
                )}
                <span
                  className={
                    uploadStep === 2
                      ? 'text-slate-100 font-semibold'
                      : uploadStep > 2
                      ? 'text-slate-500 line-through'
                      : 'text-slate-600'
                  }
                >
                  2. Extracting profile details with Gemini AI
                </span>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-center space-x-3">
                {uploadStep > 3 ? (
                  <span className="text-emerald-400 font-bold text-base">✓</span>
                ) : uploadStep === 3 ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                ) : (
                  <span className="text-slate-700">○</span>
                )}
                <span
                  className={
                    uploadStep === 3
                      ? 'text-slate-100 font-semibold'
                      : uploadStep > 3
                      ? 'text-slate-500 line-through'
                      : 'text-slate-600'
                  }
                >
                  3. Persisting session credentials to Vercel KV
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
        >
          {isUploading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              <span>Processing...</span>
            </>
          ) : (
            <span>Upload and Analyze Resume</span>
          )}
        </button>
      </form>
    </div>
  );
}
