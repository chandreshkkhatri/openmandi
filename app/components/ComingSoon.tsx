export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 text-3xl text-primary">
          {"\u25C6"}
        </div>
        <h1 className="mb-3 text-3xl font-bold text-white">{title}</h1>
        <p className="mb-8 text-zinc-400">{description}</p>
        <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
