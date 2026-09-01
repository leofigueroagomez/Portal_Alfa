"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Clock, Calendar, Bot, ShieldCheck, MessageCircle } from "lucide-react";
import { BlogPost, BlogCategory } from "@/lib/blog";

type Props = {
  posts: BlogPost[];
  categories: BlogCategory[];
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

export default function BlogDirectoryClient({ posts, categories }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "todos" || selectedCategory === "all") {
      return posts;
    }
    return posts.filter((p) => p.categorySlug === selectedCategory);
  }, [posts, selectedCategory]);

  return (
    <div className="space-y-12">
      {/* Category Pills */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                isActive
                  ? "bg-[#7A1F2B] text-white shadow-lg shadow-[#7A1F2B]/30 border border-[#B84A5A]"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              {cat.title}
            </button>
          );
        })}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map((post) => {
          const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
            post.whatsappQuoteMessage
          )}`;

          return (
            <article
              key={post.slug}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121216] transition duration-300 hover:border-[#B84A5A]/60 hover:bg-[#16161C] hover:shadow-2xl hover:shadow-[#7A1F2B]/15"
            >
              <div>
                {/* Image Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                  <Image
                    src={post.coverImage}
                    alt={post.coverImageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-black/30" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F0B8C0] border border-[#B84A5A]/40">
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#B84A5A]" />
                      {post.publishedAtFormatted}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#B84A5A]" />
                      {post.readTime}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`} className="block">
                    <h2 className="text-xl font-bold font-serif text-white group-hover:text-[#F0B8C0] transition leading-snug">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* AI Editorial Transparency Pill */}
                  {post.aiEditorialDisclosure.isAiAssisted && (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-300">
                      <Bot className="h-3 w-3 text-[#B84A5A]" />
                      <span>Asistido por IA & Validado por Ingeniería ALFA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3 border-t border-white/5 mt-4 pt-4">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white group-hover:text-[#F0B8C0] transition"
                >
                  <span>Leer artículo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-900/50 hover:border-emerald-400"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Cotizar</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
