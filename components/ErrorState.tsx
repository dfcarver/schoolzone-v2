"use client";

import Link from "next/link";

interface ErrorStateProps {
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ErrorState({
  message = "Demo Data Unavailable",
  backHref,
  backLabel = "Go Back",
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-red-500 mb-2">{message}</p>
        {backHref && (
          <Link href={backHref} className="text-sm text-blue-600 hover:underline">
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
