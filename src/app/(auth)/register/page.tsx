import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, RegisterForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" subtitle="Free to start. No credit card required." footer={<>Already have an account? <Link href="/login" className="font-medium text-gray-900 hover:underline dark:text-white">Sign in</Link></>}>
      <RegisterForm />
    </AuthCard>
  );
}
