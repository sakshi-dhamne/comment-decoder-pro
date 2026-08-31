import { Link, useParams, Navigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import { getPostBySlug } from "@/data/blogPosts";

const SITE_URL = "https://comment-decoder-pro.lovable.app";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={`${post.title} — Comment Decoder Pro`}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: new Date(post.date).toISOString().slice(0, 10),
          image: `${SITE_URL}${post.cover}`,
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
          author: { "@type": "Organization", name: "Comment Decoder Pro" },
          publisher: { "@type": "Organization", name: "Comment Decoder Pro" },
        }}
      />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <nav className="mb-8 text-sm">
          <Link to="/blog" className="text-primary hover:underline">← All posts</Link>
        </nav>

        <article>
          <header className="mb-8">
            <p className="text-xs text-muted-foreground mb-3">
              {post.date} · {post.readTime}
            </p>
            <h1 className="text-4xl font-bold mb-4 leading-tight">{post.title}</h1>
            <p className="text-lg text-muted-foreground">{post.description}</p>
          </header>

          <div className="rounded-lg overflow-hidden border border-border mb-10">
            <img src={post.cover} alt={post.title} className="w-full" />
          </div>

          <div className="space-y-5 leading-relaxed">
            {post.sections.map((section, i) => {
              if (section.type === "h2") {
                return (
                  <h2 key={i} className="text-2xl font-semibold mt-10 mb-2">
                    {section.text}
                  </h2>
                );
              }
              if (section.type === "p") {
                return <p key={i}>{section.text}</p>;
              }
              if (section.type === "ul") {
                return (
                  <ul key={i} className="list-disc pl-6 space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (section.type === "img") {
                return (
                  <figure key={i} className="my-6">
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={section.src} alt={section.alt} loading="lazy" className="w-full" />
                    </div>
                    {section.caption && (
                      <figcaption className="text-xs text-muted-foreground text-center mt-2">
                        {section.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              return null;
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Try it now →
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
};

export default BlogPost;
