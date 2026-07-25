import { notFound } from "next/navigation";
import {
  canDeleteBlindQuoteItems,
  canManageBlindQuotes,
} from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import BlindQuoteEditor from "./BlindQuoteEditor";

export default async function BlindQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quoteId = Number(id);
  if (!Number.isInteger(quoteId) || quoteId <= 0) notFound();

  const profile = await getCurrentInternalUserProfile();

  return (
    <BlindQuoteEditor
      quoteId={quoteId}
      canEdit={canManageBlindQuotes(profile?.role)}
      canDelete={canDeleteBlindQuoteItems(profile?.role)}
    />
  );
}
