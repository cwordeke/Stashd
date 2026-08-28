"use client";

import { Suspense, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import BrandIllustration from "@/components/BrandIllustration";
import { signInWithEmail, signUpWithEmail } from "@/app/actions/auth";
import { cn } from "@/lib/cn";
import { DEFAULT_AUTH_NEXT, safeRelativePath } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "signin" | "signup";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Sign-in failed. Please try again."
      : null
  );

  const nextPath = safeRelativePath(
    searchParams.get("next"),
    DEFAULT_AUTH_NEXT
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  async function handleSignIn(formData: FormData) {
    setError(null);
    const result = await signInWithEmail(formData);
    if (result?.error) setError(result.error);
  }

  async function handleSignUp(formData: FormData) {
    setError(null);
    const result = await signUpWithEmail(formData);
    if (result?.error) setError(result.error);
  }

  async function handleGoogleSignIn() {
    setOauthLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <div className="border border-white/10 bg-zinc-900/50 p-8">
      <div className="mb-4 text-center">
        <Link
          href="/"
          className="inline-flex justify-center text-[17px] font-bold tracking-[-0.035em] text-white"
        >
          <BrandMark stacked size={96} priority className="gap-2" />
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {isSignUp ? "Create your account" : "Sign in to continue"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Save your Top 4 stash across movies, TV, games, books, and music.
        </p>
        <BrandIllustration
          id="five-media"
          size="lg"
          className="mx-auto -mb-3 mt-0 w-full max-w-[min(100%,380px)] max-h-[210px] object-contain object-center"
          priority
        />
      </div>

      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-5 grid grid-cols-2 rounded-md border border-white/[0.08] bg-white/[0.03] p-1"
      >
        <ModeTab
          active={!isSignUp}
          onClick={() => switchMode("signin")}
          disabled={oauthLoading}
        >
          Sign In
        </ModeTab>
        <ModeTab
          active={isSignUp}
          onClick={() => switchMode("signup")}
          disabled={oauthLoading}
        >
          Sign Up
        </ModeTab>
      </div>

      {isSignUp ? (
        <form action={handleSignUp} className="space-y-4">
          <EmailField disabled={oauthLoading} />
          <PasswordField
            autoComplete="new-password"
            disabled={oauthLoading}
          />
          {error ? <AuthError message={error} /> : null}
          <SubmitButton disabled={oauthLoading} pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      ) : (
        <form action={handleSignIn} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <EmailField disabled={oauthLoading} />
          <PasswordField
            autoComplete="current-password"
            disabled={oauthLoading}
          />
          {error ? <AuthError message={error} /> : null}
          <SubmitButton disabled={oauthLoading} pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      )}

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Or
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={oauthLoading}
        className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {oauthLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className="mt-6 text-center text-xs text-zinc-500">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded px-3 py-2 text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        active
          ? "bg-zinc-800 text-white shadow-sm"
          : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function EmailField({ disabled }: { disabled?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Email
      </span>
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        disabled={disabled}
        className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/[0.18] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function PasswordField({
  autoComplete,
  disabled,
}: {
  autoComplete: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Password
      </span>
      <input
        type="password"
        name="password"
        required
        minLength={6}
        autoComplete={autoComplete}
        placeholder="••••••••"
        disabled={disabled}
        className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/[0.18] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-red-400">
      {message}
    </p>
  );
}

function SubmitButton({
  children,
  pendingLabel,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Suspense
        fallback={
          <div className="border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
