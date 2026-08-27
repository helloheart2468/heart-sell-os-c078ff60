import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useOffers } from "@/lib/offers";
import { createBrief } from "@/lib/threads";

export const Route = createFileRoute("/studio/brief/")({
  head: () => ({
    meta: [
      { title: "Audience Audit — Heart Sell OS" },
      {
        name: "description",
        content:
          "Open the Audience Audit for the offer you're working on right now.",
      },
      { property: "og:title", content: "Audience Audit — Heart Sell OS" },
      {
        property: "og:description",
        content: "One audit per offer, feeding Scout, Quill and Ace.",
      },
    ],
  }),
  component: BriefIndex,
});

function BriefIndex() {
  const navigate = useNavigate();
  const { offers, currentId, isLoading, refresh } = useOffers();

  useEffect(() => {
    if (isLoading) return;
    const target = currentId ?? offers[0]?.id;
    if (target) {
      void navigate({ to: "/studio/brief/$briefId", params: { briefId: target }, replace: true });
      return;
    }
    void (async () => {
      const id = await createBrief({ name: "My first offer" });
      await refresh();
      await navigate({ to: "/studio/brief/$briefId", params: { briefId: id }, replace: true });
    })();
  }, [isLoading, currentId, offers, navigate, refresh]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Opening your audit…
    </div>
  );
}
