import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center text-[13px] text-zinc-400 transition-colors hover:text-zinc-200"
      >
        ← Back to home
      </Link>
      {children}
      <div className="mt-12 border-t border-white/10 pt-6">
        <Link
          href="/"
          className="inline-flex items-center text-[13px] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
