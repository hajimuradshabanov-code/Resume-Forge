"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button, Field, Input, api } from "@/components/ui";
import { Logo } from "@/components/AppHeader";
import { loginSchema, registerSchema } from "@/lib/validation";

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">{footer}</p>
      </div>
    </main>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const onSubmit = async (values: LoginValues) => {
    try {
      const { user } = await api<{ user: { onboardingCompleted: boolean } }>("/api/auth/login", { method: "POST", json: values });
      router.push(next && next.startsWith("/") ? next : user.onboardingCompleted ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} required>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <div className="flex justify-end text-xs"><Link href="/forgot-password" className="text-gray-500 hover:underline">Forgot password?</Link></div>
      <Button type="submit" className="w-full" loading={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const onSubmit = async (values: RegisterValues) => {
    try {
      await api("/api/auth/register", { method: "POST", json: values });
      toast.success("Welcome to ResumeForge");
      router.push("/onboarding");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters." required>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-[11px] text-gray-500">Your resumes are private by default and only visible to you.</p>
    </form>
  );
}
