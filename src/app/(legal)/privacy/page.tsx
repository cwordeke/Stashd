import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Stashd collects, uses, stores, and deletes your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      <header className="border-b border-white/10 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Last Updated: August 26, 2026
        </p>
      </header>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-zinc-400">
        <p>
          This Privacy Policy describes how Stashd (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) collects, uses, and stores
          information when you use stashd.site and related services. By using
          Stashd, you agree to this policy.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Information We Collect
          </h2>
          <p>
            We collect only the information needed to operate your account and
            provide the service:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-zinc-300">Basic profile information</span>{" "}
              provided through Google Sign-In and Supabase Auth, including your
              name, email address, and profile avatar.
            </li>
            <li>
              <span className="text-zinc-300">User-generated content</span> you
              choose to create on Stashd, including diary logs, ratings,
              reviews, lists, profile details, and similar activity.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Third-Party Services
          </h2>
          <p>
            Stashd integrates with the following third-party services to
            authenticate users, import libraries, and display media metadata:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-zinc-300">Google OAuth</span> — sign-in and
              basic profile information (name, email, and avatar).
            </li>
            <li>
              <span className="text-zinc-300">Spotify API</span> — optional
              music library import and related metadata.
            </li>
            <li>
              <span className="text-zinc-300">Steam Web API</span> — optional
              game library import and related metadata.
            </li>
            <li>
              <span className="text-zinc-300">TMDB and IGDB</span> — movie, TV,
              and video game titles, artwork, and other public media metadata.
            </li>
          </ul>
          <p>
            These providers have their own privacy policies. We do not receive
            or store your Google, Spotify, or Steam passwords. Google account
            data is used only to authenticate you and populate your Stashd
            profile.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Data Usage &amp; Storage
          </h2>
          <p>
            We use your information to create and maintain your account, save
            your logs and ratings, personalize your experience, and operate
            Stashd. User data is stored securely in Supabase PostgreSQL and is
            never sold to third parties.
          </p>
          <p>
            We do not use Google user data for advertising, and we do not share
            it with third parties except as needed to operate the service (for
            example, hosting with our database provider).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Data Deletion
          </h2>
          <p>
            You may request deletion of your Stashd account and associated data
            at any time. You may also disconnect third-party services such as
            Google, Spotify, or Steam at any time by revoking access in those
            services&apos; account settings or by contacting us to remove the
            linked connection from Stashd.
          </p>
          <p>
            To request account deletion, contact us through the Stashd website
            or associated support channels. We will delete your account data
            from our systems except where we are required to retain limited
            information for legal or security purposes.
          </p>
        </section>
      </div>
    </article>
  );
}
