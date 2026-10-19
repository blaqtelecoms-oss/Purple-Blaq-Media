import PageHeader from "@/components/pb/PageHeader";
import Story from "@/components/pb/Story";
import Team from "@/components/pb/Team";
import PartnerBand from "@/components/pb/PartnerBand";
import Commitment from "@/components/pb/Commitment";
import CTA from "@/components/pb/CTA";
import { useSeo } from "@/hooks/useSeo";

export default function About() {
  useSeo(
    "About Us | Purple Blaq Media",
    "Purple Blaq Media is a South African digital technology and business solutions company helping organisations across the country work better through technology."
  );
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="Technology that makes business <em>work better</em>"
        lead="A South African digital technology and business solutions company helping organisations improve the way they work — with national reach across South Africa."
      />
      <Story />
      <Team />
      <PartnerBand />
      <Commitment />
      <CTA />
    </>
  );
}