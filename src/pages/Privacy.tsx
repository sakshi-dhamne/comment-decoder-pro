import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Seo
      title="Privacy Policy — Comment Decoder Pro"
      description="How Comment Decoder Pro handles session data, YouTube comment data, analytics and advertising cookies, plus retention and your rights."
      path="/privacy"
    />
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8 text-sm">
        <Link to="/" className="text-primary hover:underline">← Back to app</Link>
      </nav>
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 25, 2026</p>

      <p className="mb-6">
        This Privacy Policy explains how Comment Decoder Pro ("we", "our", "the service")
        collects, uses, and protects information when you use the website.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">1. Information we collect</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Anonymous session ID</strong> — a random identifier stored in your browser's localStorage so we can show you your own analysis history. It is not tied to a personal account.</li>
        <li><strong>YouTube URLs you submit</strong> — stored alongside the analysis result so it can be re-displayed and cached for 24 hours.</li>
        <li><strong>Public YouTube comments</strong> — fetched from the public YouTube Data API for the videos you submit. We do not access private data.</li>
        <li><strong>Aggregated analytics</strong> — page views, country, device type. We use a privacy-friendly analytics provider that does not set tracking cookies.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">2. Cookies and advertising</h2>
      <p className="mb-4">
        We display ads via Google AdSense. Google and its partners may use cookies to
        serve ads based on your prior visits to this and other websites. You can opt
        out of personalized advertising by visiting{" "}
        <a href="https://www.google.com/settings/ads" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Google Ad Settings
        </a>.
      </p>
      <p className="mb-6">
        Third-party vendors, including Google, use cookies to serve ads based on a
        user's previous visits. Google's use of advertising cookies enables it and its
        partners to serve ads to users based on their visits to this site and/or other
        sites on the Internet.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">3. How we use information</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>To generate and display the analysis you requested</li>
        <li>To cache results and reduce API costs</li>
        <li>To show you your past reports under your session</li>
        <li>To monitor service health and improve the product</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">4. Data sharing</h2>
      <p className="mb-6">
        We do not sell your data. Comment text is sent to Google's Gemini models for
        analysis under their standard API terms. Aggregated analytics are processed by
        our analytics provider. Ads are served by Google AdSense.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">5. Data retention</h2>
      <p className="mb-6">
        Analysis reports are cached for 24 hours. After that, repeat requests trigger a
        fresh analysis. You can clear your local session history at any time by
        clearing your browser's site data for this domain.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">6. Your rights</h2>
      <p className="mb-6">
        Because the service is anonymous and not tied to a personal account, there is
        no login to delete. Clearing your browser's site data for this domain removes
        your local session ID and history. To request deletion of any specific cached
        report, contact us via the feedback form on the home page.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">7. Children</h2>
      <p className="mb-6">
        The service is not directed to children under 13 and we do not knowingly
        collect data from children.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">8. Changes</h2>
      <p>
        We may update this policy from time to time. The "Last updated" date at the top
        of this page reflects the most recent change.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Privacy;
