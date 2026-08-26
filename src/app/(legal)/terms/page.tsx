import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms that govern your use of Stashd.",
};

export default function TermsOfServicePage() {
  return (
    <article>
      <header className="border-b border-white/10 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Last Updated: August 26, 2026
        </p>
      </header>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-zinc-400">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of Stashd, including the website at stashd.site. Please read them
          carefully.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Acceptance of Terms
          </h2>
          <p>
            By creating an account, signing in, or otherwise using Stashd, you
            agree to these Terms. If you do not agree, do not use the service.
            We may update these Terms from time to time; continued use after
            changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            User Accounts &amp; Conduct
          </h2>
          <p>
            You are responsible for maintaining the security of your account,
            including your login credentials and any connected third-party
            accounts. You must not share your account or attempt to access
            another user&apos;s account without permission.
          </p>
          <p>
            You agree not to post abusive, harassing, hateful, or illegal
            content, and not to spam, scrape, or otherwise misuse the service.
            You are solely responsible for the diary logs, ratings, reviews,
            and other content you publish on Stashd.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Third-Party Content
          </h2>
          <p>
            Stashd uses third-party APIs — including TMDB, IGDB, Spotify, and
            Steam — to display media titles, artwork, and related metadata.
            Stashd does not claim ownership of these external media assets or
            of the underlying films, shows, games, books, or music they
            describe.
          </p>
          <p>
            Trademarks, posters, cover art, and similar materials remain the
            property of their respective owners. Availability of third-party
            data may change without notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these Terms or our community guidelines, including accounts used to
            post abusive content, spam, or otherwise disrupt the service. You
            may stop using Stashd at any time and may request account deletion
            as described in our Privacy Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Disclaimer of Warranties
          </h2>
          <p>
            Stashd is provided &quot;as is&quot; and &quot;as available&quot;
            without warranties of any kind, whether express or implied,
            including but not limited to implied warranties of merchantability,
            fitness for a particular purpose, and non-infringement. We do not
            warrant that the service will be uninterrupted, error-free, or
            free of inaccurate third-party metadata.
          </p>
          <p>
            To the fullest extent permitted by law, Stashd and its operators
            are not liable for any indirect, incidental, or consequential
            damages arising from your use of the service.
          </p>
        </section>
      </div>
    </article>
  );
}
