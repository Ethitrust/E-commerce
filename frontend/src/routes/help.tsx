import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/SiteShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  [
    "How do I place an order?",
    "Add items to your cart and proceed to checkout. We accept all major payment methods.",
  ],
  [
    "What is buyer protection?",
    "Every order is covered. If your item doesn't arrive or doesn't match the listing, you're refunded in full.",
  ],
  [
    "How do I become a seller?",
    "Sign up for a free account and complete your seller profile. Most sellers are approved within 24 hours.",
  ],
  [
    "How do auctions work?",
    "Live bid listings show a countdown. Place your bid above the current highest bid to win when the timer ends.",
  ],
  [
    "What's your return policy?",
    "30-day free returns on most items. Custom or final-sale items are non-returnable.",
  ],
];

export const Route = createFileRoute("/help")({
  component: () => (
    <SiteShell>
      <div className="container-page max-w-3xl py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Help center</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">How can we help?</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Browse common questions or reach out to our team for personalized support.
        </p>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-sm font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteShell>
  ),
});
