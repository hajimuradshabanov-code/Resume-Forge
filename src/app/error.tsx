"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong.</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">An unexpected error occurred. Your saved work is safe.</p>
      <button onClick={reset} className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900">Try again</button>
    </main>
  );
}
