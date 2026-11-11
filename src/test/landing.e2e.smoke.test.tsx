import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "../orchest/components/Hero";

const themeSettings = {
  activeTheme: "default" as const,
  forceThemeOverride: false,
  enableTimeGreetings: true,
  enableOffersSection: true,
};

describe("landing page E2E smoke", () => {
  it("supports the RTL hero search and both conversion actions", () => {
    const onSearchChange = vi.fn();
    const onExploreClick = vi.fn();
    const onOrderClick = vi.fn();
    render(
      <Hero
        theme="dark"
        themeSettings={themeSettings}
        searchQuery=""
        onSearchChange={onSearchChange}
        selectedCategory="all"
        onSelectCategory={vi.fn()}
        onExploreClick={onExploreClick}
        onOrderClick={onOrderClick}
      />,
    );

    expect(screen.getByRole("region")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("ORCHEST STUDIO")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "زفة" } });
    fireEvent.click(screen.getByRole("button", { name: "اطلب عملك الخاص" }));
    fireEvent.click(screen.getByRole("button", { name: "استكشف الكتالوج" }));

    expect(onSearchChange).toHaveBeenCalledWith("زفة");
    expect(onOrderClick).toHaveBeenCalledOnce();
    expect(onExploreClick).toHaveBeenCalledOnce();
  });
});
