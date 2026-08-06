export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-panel-border p-3">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre o telefono..."
        className="h-12 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
      />
    </div>
  );
}
