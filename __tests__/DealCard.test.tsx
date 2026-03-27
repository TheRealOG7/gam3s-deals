import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DealCard } from "@/components/DealCard";
import type { Deal } from "@/lib/deals";

const deal: Deal = {
  title: "Elden Ring",
  sale_price: "13.00",
  normal_price: "59.99",
  savings_pct: 78,
  deal_url: "https://gog.com/elden-ring",
  expiry: null,
  steam_score: 96,
};

describe("DealCard", () => {
  it("renders game title", () => {
    render(<DealCard deal={deal} image={null} href={deal.deal_url} />);
    expect(screen.getByText("Elden Ring")).toBeInTheDocument();
  });
  it("renders sale price", () => {
    render(<DealCard deal={deal} image={null} href={deal.deal_url} />);
    expect(screen.getByText("$13.00")).toBeInTheDocument();
  });
  it("renders discount badge", () => {
    render(<DealCard deal={deal} image={null} href={deal.deal_url} />);
    expect(screen.getByText("−78%")).toBeInTheDocument();
  });
  it("renders steam score when available", () => {
    render(<DealCard deal={deal} image={null} href={deal.deal_url} />);
    expect(screen.getByText("★ 96%")).toBeInTheDocument();
  });
  it("omits steam score when not provided", () => {
    render(<DealCard deal={{ ...deal, steam_score: undefined }} image={null} href={deal.deal_url} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
  it("links to deal URL with target blank", () => {
    render(<DealCard deal={deal} image={null} href={deal.deal_url} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://gog.com/elden-ring");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
