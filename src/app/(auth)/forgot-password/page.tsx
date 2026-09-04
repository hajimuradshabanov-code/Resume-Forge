import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" subtitle="Self-service password reset requires an outbound email provider." footer={<Link href="/login" className="font-medium text-gray-900 hover:underline dark:text-white">Back to sign in</Link>}>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
        <p className="font-medium">Email delivery is not configured on this deployment.</p>
        <p className="mt-1">Once an email provider is connected, reset links will be sent here. In the meantime, if you are signed in you can change your password from <strong>Settings → Account</strong>; otherwise contact the administrator of this instance.</p>
      </div>
    </AuthCard>
  );
}
