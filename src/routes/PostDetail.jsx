import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { CalendarDays, MapPin, Paperclip, Download } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { CATEGORY_META, ReadMore, SubHeader, isBrowserViewable, MediaModal } from "../components/site/posts";

function Fallback({ title, hint }) {
  return (
    <div className="min-h-screen bg-background">
      <SubHeader />
      <main className="container-x py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
        <Link to="/news" className="mt-8 inline-block rounded-full brand-gradient px-6 py-3 text-sm font-semibold text-white">
          Browse all updates
        </Link>
      </main>
    </div>
  );
}

function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalUrl, setModalUrl] = useState(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, slug, category, excerpt, body, location, deadline, created_at, cover_image_url, attached_files")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        
        if (error) throw error;
        if (!data) {
          setError("not_found");
          return;
        }
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SubHeader />
        <main className="container-x py-16 sm:py-20">
          <div className="mx-auto max-w-3xl animate-pulse">
            <div className="h-8 w-24 rounded-full bg-muted" />
            <div className="mt-4 h-12 w-3/4 rounded-lg bg-muted" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error === "not_found") {
    return <Fallback title="Post not found" hint="This item may have been removed or unpublished." />;
  }

  if (error) {
    return <Fallback title="Something went wrong" hint="Please try again in a moment." />;
  }

  const meta = CATEGORY_META[post.category];

  return (
    <>
      {modalUrl && <MediaModal url={modalUrl} onClose={() => setModalUrl(null)} />}
      <div className="min-h-screen bg-background">
        <SubHeader />
        <main className="container-x py-16 sm:py-20">
          <article className="mx-auto max-w-3xl">
            <Link to={meta?.path ?? "/news"} className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              {meta?.label ?? post.category}
            </Link>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-5 text-xs font-semibold text-muted-foreground">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              {post.location && (
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{post.location}</span>
              )}
              {post.deadline && (
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Closes {post.deadline}</span>
              )}
            </div>
            {post.cover_image_url && (
              <div className="mt-8">
                <img
                  src={post.cover_image_url}
                  alt="Cover"
                  className="w-full rounded-2xl object-cover"
                  onClick={() => isBrowserViewable(post.cover_image_url) && setModalUrl(post.cover_image_url)}
                />
              </div>
            )}
            {post.excerpt && (
              <p className="mt-8 border-l-2 border-secondary/40 pl-5 text-lg leading-relaxed text-foreground/80">
                {post.excerpt}
              </p>
            )}
            <div className="mt-8">
              <ReadMore text={post.body} />
            </div>
            {post.attached_files && post.attached_files.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-secondary">Attachments</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {post.attached_files.map((file, idx) => {
                    const viewable = isBrowserViewable(file);
                    const fileName = file.split('/').pop();
                    const ext = file.split('.').pop().toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
                    return viewable ? (
                      <button
                        key={idx}
                        onClick={() => setModalUrl(file)}
                        className="relative size-16 rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-secondary/40 transition-colors"
                        title={fileName}
                      >
                        {isImage ? (
                          <img src={file} alt={fileName} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Paperclip className="size-5 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    ) : (
                      <a
                        key={idx}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={fileName}
                      >
                        <Download className="size-4" />
                        {fileName}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-14 rounded-3xl border border-border bg-card p-8">
              <h2 className="font-display text-lg font-bold">Interested?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Reach our team through the contact form and reference this post.
              </p>
              <Link to="/" className="mt-6 inline-block rounded-full brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft">
                Contact us
              </Link>
            </div>
          </article>
        </main>
      </div>
    </>
  );
}

export default PostDetail;
