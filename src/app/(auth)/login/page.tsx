import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, LoginForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue building your resume." footer={<>Don&apos;t have an account? <Link href="/register" className="font-medium text-gray-900 hover:underline dark:text-white">Create one</Link></>}>
      <Suspense><LoginForm /></Suspense>
    </AuthCard>
  );
}
