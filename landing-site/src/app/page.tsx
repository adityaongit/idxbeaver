"use client";

import { Divider } from "@/components/divider";
import { FeaturesGrid } from "@/components/features-grid";
import { FinalCta } from "@/components/final-cta";
import { Hero } from "@/components/hero";
import { HeroProduct } from "@/components/hero-product";
import { ProductSection } from "@/components/product-section";
import { Quote } from "@/components/quote";
import { QuerySection } from "@/components/query-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { useReveal } from "@/hooks/use-reveal";

export default function Home() {
  useReveal();

  return (
    <>
      <SiteNav />
      <main>
        <section className="relative">
          <Hero />
          <Divider />
          <div className="mt-10 sm:mt-12 lg:mt-14">
            <HeroProduct />
          </div>
        </section>

        <div className="mt-20 sm:mt-28 lg:mt-40">
          <Divider />
        </div>

        <ProductSection />

        <Divider />

        <QuerySection />

        <Divider />

        <FeaturesGrid />

        <Divider />

        <Quote />

        <Divider />

        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
