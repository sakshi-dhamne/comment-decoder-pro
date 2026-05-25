import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";

const About = () => (
  <div className="min-h-screen bg-background text-foreground">
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8 text-sm">
        <Link to="/" className="text-primary hover:underline">← Back to app</Link>
      </nav>
      <h1 className="text-4xl font-bold mb-4">About Comment Decoder Pro</h1>
      <p className="text-muted-foreground mb-6">
        Comment Decoder Pro is a free tool that helps YouTube creators, marketers, and
        researchers make sense of the comments under any public YouTube video.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">What it does</h2>
      <p className="mb-4">
        Paste a YouTube URL and we fetch the public comments via the YouTube Data API,
        then run a structured AI pipeline to detect sentiment, surface recurring topics,
        cluster ideas for new content, and highlight trends across the comment thread.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Who it's for</h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Creators wanting fast feedback on a new upload</li>
        <li>Marketers tracking sentiment around a brand video</li>
        <li>Researchers studying online discussion patterns</li>
        <li>Anyone who has stared at 2,000 comments and given up</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-3">How we built it</h2>
      <p className="mb-4">
        The app runs on a modern serverless stack. Comments come from the official
        YouTube Data API. Analysis is performed by Google Gemini Flash models through
        a managed AI gateway. Results are cached for 24 hours so repeat lookups are
        instant and cost-efficient.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
      <p>
        Found a bug or have a feature request? Use the feedback form on the home page,
        or reach out via the review link there. We read every submission.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
