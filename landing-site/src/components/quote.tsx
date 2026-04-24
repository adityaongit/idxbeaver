export function Quote() {
  return (
    <section className="r py-24 text-center sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <blockquote
          className="mx-auto max-w-[920px] font-medium text-[var(--color-ink)]"
          style={{
            fontSize: "clamp(24px, 3.8vw, 52px)",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
          }}
        >
          The Application panel treats browser storage as an afterthought.
          <br className="hidden sm:block" />
          So we built the tool <span className="ir">we wanted.</span>
        </blockquote>
        <cite className="mono mt-8 block text-[11.5px] not-italic tracking-[0.06em] text-[var(--color-ink-mute)]">
          — Notes from the authors
        </cite>
      </div>
    </section>
  );
}
