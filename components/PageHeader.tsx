/** 페이지 제목(h1) + 한 줄 설명 + 대표 행동. 화면마다 한 번만 쓴다. */
export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-page font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-2 text-body text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
