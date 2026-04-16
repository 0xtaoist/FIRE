import { FireClubHero } from "@/components/ui/hero-club";
import { History } from "@/components/history";
import { Doctrine } from "@/components/doctrine";
import { Proof } from "@/components/proof";
import { Prophecy } from "@/components/prophecy";
import { Calculator } from "@/components/calculator";
import { Faq } from "@/components/faq";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <FireClubHero />
      <main>
        <History />
        <Doctrine />
        <Proof />
        <Calculator />
        <Prophecy />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
