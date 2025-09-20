export function PostCard({ title, summary }: { title: string; summary: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{summary}</p>
    </div>
  );
}