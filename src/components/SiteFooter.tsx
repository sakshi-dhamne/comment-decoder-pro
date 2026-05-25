import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="border-t border-border mt-16 py-8 text-sm text-muted-foreground">
    <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
      <p>© {new Date().getFullYear()} Comment Decoder Pro</p>
      <nav className="flex flex-wrap gap-4">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
        <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
