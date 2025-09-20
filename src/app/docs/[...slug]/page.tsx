export default function DocPage({ params }: { params: { slug: string[] } }) {
  return (
    <div>
      <h1>Doc Page: {params.slug.join('/')}</h1>
    </div>
  );
}