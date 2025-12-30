export default async function Page({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pastes/${params.id}`, {
    cache: "no-store",
  });

  if (!res.ok) return <h1>Paste not found</h1>;

  const data = await res.json();

  return (
    <pre style={{ whiteSpace: "pre-wrap", padding: "20px" }}>
      {data.content}
    </pre>
  );
}
