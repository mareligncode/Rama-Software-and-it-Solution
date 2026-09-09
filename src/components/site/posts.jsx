import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, X, Paperclip, Download } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { Reveal } from "./primitives";
import logo from "../../assets/logo.png";

export const CATEGORY_META = {
  news: { label: "News", path: "/news", title: "News & Announcements" },
  career: { label: "Careers", path: "/careers", title: "Career Opportunities" },
  internship: { label: "Internships", path: "/internships", title: "Internship Programmes" },
  event: { label: "Events", path: "/events", title: "Events & Webinars" },
};

export const POST_LIST_FIELDS =
  "id, title, slug, category, excerpt, location, deadline, created_at, cover_image_url, attached_files";

export function isBrowserViewable(url) {
  const ext = url.split('.').pop().toLowerCase();
  const viewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'ogg', 'mp3', 'wav', 'pdf'];
  return viewableExtensions.includes(ext);
}

export function usePublishedPosts(category, limit = 60) {
  return useQuery({
    queryKey: ["public-posts", category ?? "all", limit],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(POST_LIST_FIELDS)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function PostCard({ post }) {
  const meta = CATEGORY_META[post.category];
  const [modalUrl, setModalUrl] = useState(null);

  return (
    <>
      {modalUrl && <MediaModal url={modalUrl} onClose={() => setModalUrl(null)} />}
      <article className="card-lux group flex h-full flex-col rounded-3xl border border-border bg-background p-7 transition-all hover:-translate-y-1.5 hover:border-secondary/30 hover:shadow-float">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
          {meta?.label ?? post.category}
        </span>
        {post.cover_image_url && (
          <div className="mt-3">
            <img
              src={post.cover_image_url}
              alt="Cover"
              className="h-40 w-full rounded-xl object-cover"
              onClick={() => isBrowserViewable(post.cover_image_url) && setModalUrl(post.cover_image_url)}
            />
          </div>
        )}
        <h3 className="mt-4 font-display text-lg font-bold leading-snug">{post.title}</h3>
        {post.excerpt && (
          <p className="mt-3 flex-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
          {post.location && (
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{post.location}</span>
          )}
          {post.deadline && (
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Closes {post.deadline}</span>
          )}
        </div>
        {post.attached_files && post.attached_files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.attached_files.map((file, idx) => {
              const viewable = isBrowserViewable(file);
              const fileName = file.split('/').pop();
              const ext = file.split('.').pop().toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
              return viewable ? (
                <button
                  key={idx}
                  onClick={() => setModalUrl(file)}
                  className="relative size-12 rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-secondary/40 transition-colors"
                  title={fileName}
                >
                  {isImage ? (
                    <img src={file} alt={fileName} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Paperclip className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ) : (
                <a
                  key={idx}
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={fileName}
                >
                  <Download className="size-3" />
                  {fileName}
                </a>
              );
            })}
          </div>
        )}
        <Link
          to={`/updates/${post.slug}`}
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:border-secondary/40 hover:text-secondary"
        >
          View details
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </article>
    </>
  );
}

export function ReadMore({ text, clamp = 900 }) {
  const [open, setOpen] = useState(false);
  const body = text.replace(/\\n/g, "\n");
  const long = body.length > clamp;
  const shown = open || !long ? body : `${body.slice(0, clamp).trimEnd()}…`;
  return (
    <div>
      <div className="whitespace-pre-wrap text-[15px] leading-8 text-muted-foreground">{shown}</div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-6 inline-flex items-center gap-2 rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function MediaModal({ url, onClose }) {
  const ext = url.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav'].includes(ext);
  const isPdf = ext === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <X className="size-6" />
        </button>
        <div className="rounded-2xl bg-background overflow-hidden shadow-2xl">
          {isImage && (
            <img src={url} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
          )}
          {isVideo && (
            <video src={url} controls className="max-w-full max-h-[85vh]" />
          )}
          {isAudio && (
            <audio src={url} controls className="w-full p-8" />
          )}
          {isPdf && (
            <iframe src={url} className="w-full h-[85vh]" title="PDF Preview" />
          )}
        </div>
      </div>
    </div>
  );
}

export function SubHeader() {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <nav className="container-x flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Rama Software & IT Solutions logo" className="h-11 w-auto" width={140} height={72} />
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-sm font-bold tracking-tight">RAMA SOFTWARE</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">&amp; IT Solutions</span>
          </span>
        </Link>
        <ul className="hidden items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-1.5 md:flex">
          {Object.keys(CATEGORY_META).map((k) => (
            <li key={k}>
              <Link
                to={CATEGORY_META[k].path}
                className={`block rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors hover:text-foreground ${
                  location.pathname === CATEGORY_META[k].path
                    ? "bg-secondary text-white shadow-soft"
                    : "text-muted-foreground"
                }`}
              >
                {CATEGORY_META[k].label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:text-secondary"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
      </nav>
    </header>
  );
}

export function CategoryPage({ category }) {
  const meta = CATEGORY_META[category];
  const { data, isLoading } = usePublishedPosts(category);
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <SubHeader />
      <main className="container-x py-16 sm:py-20">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{meta.label}</span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Everything currently open and published by the Rama Software team.
          </p>
        </Reveal>
        <div className="mt-4 flex flex-wrap gap-2 md:hidden">
          {Object.keys(CATEGORY_META).map((k) => (
            <Link
              key={k}
              to={CATEGORY_META[k].path}
              className={`rounded-full border border-border px-4 py-2 text-xs font-semibold ${
                location.pathname === CATEGORY_META[k].path
                  ? "bg-secondary text-white shadow-soft"
                  : "text-muted-foreground"
              }`}
            >
              {CATEGORY_META[k].label}
            </Link>
          ))}
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-3xl border border-border bg-card" />)}
          {!isLoading && !data?.length && (
            <p className="text-sm text-muted-foreground">Nothing published in this category yet, please check back soon.</p>
          )}
          {data?.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 0.08}>
              <PostCard post={p} />
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
