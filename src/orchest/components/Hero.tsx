import React from "react";
import { ArrowLeft, Crown, Flag, Heart, Moon, Search, Sparkles } from "lucide-react";
import { AppThemeSettings, CategoryId, ThemeMode } from "../types/index";
import { getCulturalGreeting, getSeasonalTheme } from "../utils/cultural";

interface HeroProps {
  theme: ThemeMode;
  themeSettings: AppThemeSettings;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  onExploreClick: () => void;
  onOrderClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  theme,
  themeSettings,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onExploreClick,
  onOrderClick,
}) => {
  const isDark = theme === "dark";
  const culturalGreeting = getCulturalGreeting();
  const seasonalTheme = getSeasonalTheme(
    new Date(),
    themeSettings.forceThemeOverride ? themeSettings.activeTheme : undefined,
  );
  const SeasonalIcon = { moon: Moon, sparkles: Sparkles, crown: Crown, heart: Heart, flag: Flag }[
    seasonalTheme.icon
  ];
  const categoryPills: { id: CategoryId; label: string }[] = [
    { id: "all", label: "جميع الأعمال" },
    { id: "zaffat-bride", label: "زفات عروس" },
    { id: "sheilat-enthusiastic", label: "شيلات حماسية" },
    { id: "welcoming", label: "ترحيبية" },
    { id: "babies", label: "مواليد" },
  ];

  return (
    <section
      dir="rtl"
      aria-label="الواجهة الرئيسية"
      className="relative overflow-hidden py-16 sm:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(0,111,136,0.26),transparent_48%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-[#C9CDD2]/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#006F88]/20 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C9CDD2]/15 bg-white/[0.04] px-4 py-2 text-xs font-bold tracking-[0.22em] text-[#C9CDD2] backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C9CDD2] shadow-[0_0_14px_rgba(201,205,210,0.8)]" />
          ORCHEST STUDIO
        </div>

        <div className="mx-auto mb-7 flex max-w-max flex-col items-center gap-1 rounded-2xl border border-[#C9CDD2]/10 bg-white/[0.03] px-4 py-2 text-[#C9CDD2] backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-bold sm:text-sm">
            <SeasonalIcon className="h-4 w-4 text-[#D7B86A]" aria-hidden="true" />
            {themeSettings.enableTimeGreetings ? culturalGreeting.greeting : seasonalTheme.label}
          </div>
          <span className="text-[10px] text-[#C9CDD2]/60 sm:text-xs">
            {seasonalTheme.greeting} •{" "}
            {themeSettings.enableTimeGreetings ? culturalGreeting.subtext : seasonalTheme.subtext}
          </span>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.25] tracking-tight text-[#C9CDD2] sm:text-6xl lg:text-7xl">
          اصنع حضورك الصوتي
          <br />
          <span className="bg-gradient-to-l from-[#D7B86A] via-[#F2E1A5] to-[#C9CDD2] bg-clip-text text-transparent">
            ببصمة ملكية لا تُنسى
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-sm font-medium leading-[1.8] text-[#C9CDD2]/65 sm:text-lg">
          زفات وشيلات خليجية تُنفذ بعناية، مع تخصيص الأسماء والتفاصيل التي تجعل مناسبتك تحمل صوتك
          أنت.
        </p>

        <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/30 backdrop-blur-md focus-within:border-[#D7B86A]/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#006F88]/30 p-3 text-[#C9CDD2]">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث عن زفة، منشد، أو كلمة مفتاحية..."
              aria-label="ابحث عن زفة أو منشد"
              className="w-full bg-transparent text-sm font-medium text-[#C9CDD2] outline-none placeholder:text-[#C9CDD2]/35 sm:text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="px-3 py-1 text-xs text-[#C9CDD2]/55 hover:text-[#C9CDD2]"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        <div className="no-scrollbar mx-auto mt-5 flex max-w-3xl items-center justify-center gap-2 overflow-x-auto px-2 py-2">
          {categoryPills.map((pill) => {
            const selected = selectedCategory === pill.id;
            return (
              <button
                type="button"
                key={pill.id}
                onClick={() => onSelectCategory(pill.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  selected
                    ? "bg-[#006F88] text-[#C9CDD2] shadow-lg shadow-[#006F88]/30"
                    : "border border-white/10 bg-white/[0.04] text-[#C9CDD2]/70 hover:border-[#D7B86A]/60 hover:text-[#C9CDD2]"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOrderClick}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006F88] px-6 py-3 font-bold text-[#C9CDD2] shadow-lg shadow-[#006F88]/25 transition hover:border hover:border-[#D7B86A] hover:shadow-[0_0_28px_rgba(215,184,106,0.28)] active:scale-[0.98]"
          >
            اطلب عملك الخاص
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onExploreClick}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-[#C9CDD2] backdrop-blur-md transition hover:border-[#D7B86A]/60 hover:bg-white/10"
          >
            استكشف الكتالوج
          </button>
        </div>
      </div>
    </section>
  );
};
