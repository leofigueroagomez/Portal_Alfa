import { canManageBlindQuotes } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import BlindsQuotesList from "./BlindsQuotesList";

export default async function BlindsQuotesPage() {
  const profile = await getCurrentInternalUserProfile();

  return (
    <BlindsQuotesList canCreate={canManageBlindQuotes(profile?.role)} />
  );
}
