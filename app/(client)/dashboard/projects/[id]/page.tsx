import { redirect } from "next/navigation";

export default async function LegacyClientProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/projects/${id}`);
}
