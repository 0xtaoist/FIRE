import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
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
      <Navbar />
      <main>
        <Hero />
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
