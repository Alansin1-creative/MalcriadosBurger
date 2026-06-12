export function PageHeader({
  title,
  subtitle,
  emoji,
  centered,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  centered?: boolean;
}) {
  return (
    <header
      className={`app-page-header ${centered ? 'text-center' : 'flex items-start gap-3'}`}>
      {emoji && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-food-border bg-diner-card text-xl shadow-inner ${
            centered ? 'mx-auto mb-2' : ''
          }`}>
          {emoji}
        </span>
      )}
      <div className={centered ? '' : 'min-w-0 flex-1'}>
        <h1 className="font-display text-xl font-bold text-cream sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-food-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
