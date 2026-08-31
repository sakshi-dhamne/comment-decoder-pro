import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

const About = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Seo
      title="About Comment Decoder Pro — YouTube comment analysis"
      description="Learn what Comment Decoder Pro does, who it's for, and how it turns public YouTube comments into sentiment, topic and trend insights."
      path="/about"
    />
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

      <h2 id="contact" className="text-2xl font-semibold mt-10 mb-3">Contact & upgrades</h2>
      <p className="mb-4">
        Found a bug, have a feature request, or want more than the free daily limit?
        Use the feedback form on the home page, or email us and we'll set you up with a
        Pro plan (unlimited analyses, deeper AI, no ads).
      </p>
      <p>
        <a href="mailto:hello@comment-decoder-pro.com?subject=Comment%20Decoder%20Pro%20—%20Upgrade%20request" className="text-primary hover:underline">
          hello@comment-decoder-pro.com
        </a>
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
