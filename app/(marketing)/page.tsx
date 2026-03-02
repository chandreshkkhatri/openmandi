import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import HowItWorks from "@/app/components/HowItWorks";
import MarketPreview from "@/app/components/MarketPreview";
import CallToAction from "@/app/components/CallToAction";
import { getIndexPrices } from "@/lib/services/prices";

export default async function Home() {
  const prices = await getIndexPrices();

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <MarketPreview prices={prices} />
      <CallToAction />
    </>
  );
}
