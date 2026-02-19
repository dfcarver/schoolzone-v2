import { redirect } from "next/navigation";

export default function ZoneDetailRedirect({
  params,
}: {
  params: { zoneId: string };
}) {
  redirect(`/operations/zones/${params.zoneId}`);
}
