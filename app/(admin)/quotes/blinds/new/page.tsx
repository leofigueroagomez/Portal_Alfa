import { canManageBlindQuotes } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import BlindsAccessDenied from "../BlindsAccessDenied";
import NewBlindQuoteForm from "./NewBlindQuoteForm";

export default async function NewBlindQuotePage() {
  const profile = await getCurrentInternalUserProfile();

  if (!canManageBlindQuotes(profile?.role)) {
    return <BlindsAccessDenied />;
  }

  return <NewBlindQuoteForm />;
}
