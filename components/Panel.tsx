/** 화면의 기본 컨테이너. 패널 안에는 목록·표·차트를 두고, 다시 패널을 넣지 않는다. */
export function Panel({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 md:px-6">
      <div className="min-w-[12rem] flex-1 basis-0">
        <h2 id={id} className="text-card font-bold text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-meta text-ink-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}
