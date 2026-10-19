import Hero from "@/components/pb/Hero";
import ServicesPreview from "@/components/pb/ServicesPreview";
import PartnerBand from "@/components/pb/PartnerBand";
import ApproachStrip from "@/components/pb/ApproachStrip";
import ClientsMarquee from "@/components/pb/ClientsMarquee";
import Commitment from "@/components/pb/Commitment";
import CTA from "@/components/pb/CTA";
import { useSeo } from "@/hooks/useSeo";

export default function Home() {
  useSeo(
    "Purple Blaq Media | Technology. Workflow. Digital Solutions.",
    "Purple Blaq Media designs, develops, implements and supports web-based workflow systems and business applications across South Africa."
  );
  return (
    <>
      <Hero />
      <ServicesPreview />
      <PartnerBand showAboutButton />
      <ApproachStrip showButton />
      <ClientsMarquee />
      <Commitment />
      <CTA />
    </>
  );
}