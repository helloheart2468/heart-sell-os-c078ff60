import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCurrentBriefId,
  listBriefs,
  setCurrentBriefId,
  type BriefRecord,
} from "@/lib/threads";

export const OFFERS_KEY = ["offers"] as const;
export const CURRENT_OFFER_KEY = ["current-offer"] as const;

export function offerLabel(offer: BriefRecord | null | undefined) {
  return offer?.name?.trim() || "Untitled offer";
}

export function useOffers() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: OFFERS_KEY, queryFn: () => listBriefs() });
  const current = useQuery({ queryKey: CURRENT_OFFER_KEY, queryFn: getCurrentBriefId });

  const switchOffer = useMutation({
    mutationFn: (briefId: string | null) => setCurrentBriefId(briefId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CURRENT_OFFER_KEY });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      await queryClient.invalidateQueries({ queryKey: ["prospects"] });
      await queryClient.invalidateQueries({ queryKey: ["prospect-lists"] });
    },
  });

  const list = offers.data ?? [];
  const currentId = current.data ?? null;
  const currentOffer = list.find((offer) => offer.id === currentId) ?? null;

  return {
    offers: list,
    currentId,
    currentOffer,
    isLoading: offers.isLoading || current.isLoading,
    setCurrent: (briefId: string | null) => switchOffer.mutateAsync(briefId),
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      await queryClient.invalidateQueries({ queryKey: CURRENT_OFFER_KEY });
    },
  };
}
