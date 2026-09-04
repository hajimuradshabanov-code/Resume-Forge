import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-gray-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Resume not found.</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">The page you are looking for doesn&apos;t exist, or you don&apos;t have permission to access it.</p>
      <Link href="/dashboard" className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900">Go to dashboard</Link>
    </main>
  );
}
