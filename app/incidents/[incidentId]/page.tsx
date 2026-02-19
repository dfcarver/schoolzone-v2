import { redirect } from "next/navigation";

export default function IncidentDetailRedirect({
  params,
}: {
  params: { incidentId: string };
}) {
  redirect(`/governance/incidents/${params.incidentId}`);
}
