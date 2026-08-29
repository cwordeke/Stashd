import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-6xl font-bold tabular-nums tracking-tight text-zinc-700">
        404
      </p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Page not found</h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </p>
      </div>
      <Link
        href="/"
        className="min-h-11 rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500"
      >
        Back home
      </Link>
    </div>
  );
}
