"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, Calendar, Film } from "lucide-react";
import { PortfolioProject, PORTFOLIO_CATEGORIES } from "@/lib/portfolio";

type Props = {
  projects: PortfolioProject[];
};

export default function PortfolioDirectoryClient({ projects }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProjects = useMemo(() => {
    if (selectedCategory === "all") return projects;
    return projects.filter((p) => p.category_slug === selectedCategory);
  }, [projects, selectedCategory]);

  return (
    <div className="space-y-12">
      {/* Category Tabs */}
      {PORTFOLIO_CATEGORIES.length > 1 && (
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {PORTFOLIO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                selectedCategory === cat.id
                  ? "bg-[#9E1B32] text-white shadow-lg shadow-[#9E1B32]/30"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${
        filteredProjects.length === 1 ? "max-w-xl mx-auto" : ""
      }`}>
        {filteredProjects.map((project) => {
          const hasVideo = project.gallery.some((g) => g.type === "video");

          return (
            <Link
              key={project.id}
              href={`/portafolio/${project.slug}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121216] transition duration-300 hover:border-[#9E1B32]/50 hover:bg-[#16161B] hover:shadow-2xl hover:shadow-[#9E1B32]/15"
            >
              <div>
                {/* Image Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                  <Image
                    src={project.hero_image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-black/20" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="rounded-md bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E07A8B] border border-[#9E1B32]/40">
                      {project.category}
                    </span>
                    {hasVideo && (
                      <span className="rounded-md bg-black/80 backdrop-blur-md p-1 text-white border border-white/15">
                        <Film className="h-3.5 w-3.5 text-[#E07A8B]" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#E07A8B]" />
                      {project.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#E07A8B]" />
                      {project.year}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-serif text-white group-hover:text-[#E07A8B] transition">
                    {project.title}
                  </h3>

                  <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-3">
                    {project.summary}
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="p-6 pt-0">
                <div className="flex items-center justify-between rounded-xl bg-white/5 group-hover:bg-[#9E1B32] border border-white/10 group-hover:border-[#9E1B32] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white transition duration-200">
                  <span>Ver Caso de Estudio</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
