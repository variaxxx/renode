/** Render a section until its feature is implemented. */
export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <section className="mt-8 rounded-xl border border-border bg-card p-6 text-muted-foreground">
        Раздел появится на следующем этапе разработки.
      </section>
    </>
  )
}
