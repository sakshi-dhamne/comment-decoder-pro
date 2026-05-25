import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { blogPosts } from "@/data/blogPosts";

const Blog = () => (
  <div className="min-h-screen bg-background text-foreground">
    <main className="max-w-4xl mx-auto px-4 py-12">
      <nav className="mb-8 text-sm">
        <Link to="/" className="text-primary hover:underline">← Back to app</Link>
      </nav>
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Guides and tips for getting the most out of Comment Decoder Pro.
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
          >
            <div className="aspect-video bg-muted overflow-hidden">
              <img
                src={post.cover}
                alt={post.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
              />
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-2">
                {post.date} · {post.readTime}
              </p>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground">{post.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Blog;
