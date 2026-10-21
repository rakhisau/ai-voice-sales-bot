import CallDetailClient from "./CallDetailClient";

// Each call id is only known at request time.
export const instant = false;

export default async function CallDetailPage({ params }) {
  const { id } = await params;
  return <CallDetailClient id={id} />;
}
