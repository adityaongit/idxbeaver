export function QuerySection() {
  return (
    <section id="query" className="py-20 sm:py-28 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20">
          {/* code */}
          <div
            className="r order-2 overflow-hidden rounded-[14px] border border-[var(--color-hair-2)] bg-[var(--color-bg-2)] lg:order-1"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.06), 0 40px 100px -30px rgba(0,0,0,.7)",
            }}
          >
            <div className="flex items-center gap-[6px] border-b border-[var(--color-hair)] px-4 py-3">
              <span className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#28C840]" />
              <span className="mono ml-3 text-[11px] text-[var(--color-ink-mute)]">query.json</span>
            </div>
            <pre className="mono overflow-x-auto px-[22px] py-[20px] text-[12.5px] leading-[1.85] text-[var(--color-ink-2)] no-scrollbar">
{renderLine(1, <span className="italic text-[#7DD3B8]">{"// upcoming reviews, last-modified first"}</span>)}
{renderLine(2, <span className="text-[var(--color-ink-mute)]">{"{"}</span>)}
{renderLine(3, <>  <K>{'"store"'}</K><P>:</P> <S>{'"events"'}</S><P>,</P></>)}
{renderLine(4, <>  <K>{'"filter"'}</K><P>:</P> <P>{"{"}</P></>)}
{renderLine(5, <>    <K>{'"kind"'}</K><P>:</P> <S>{'"review"'}</S><P>,</P></>)}
{renderLine(6, <>    <K>{'"date"'}</K><P>:</P> <P>{"{ "}</P><O>{'"$gte"'}</O><P>:</P> <S>{'"2026-04-14"'}</S> <P>{"},"}</P></>)}
{renderLine(7, <>    <K>{'"seats"'}</K><P>:</P> <P>{"{ "}</P><O>{'"$gt"'}</O><P>:</P> <N>4</N> <P>{"}"}</P></>)}
{renderLine(8, <>  <P>{"},"}</P></>)}
{renderLine(9, <>  <K>{'"sort"'}</K><P>:</P> <P>{"{ "}</P><K>{'"updatedAt"'}</K><P>:</P> <N>-1</N> <P>{" },"}</P></>)}
{renderLine(10, <> <K>{'"limit"'}</K><P>:</P> <N>50</N></>)}
{renderLine(11, <P>{"}"}</P>)}
            </pre>
            <div className="mono flex flex-wrap gap-[18px] border-t border-[var(--color-hair)] px-[22px] py-3 text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-ink-mute)]">
              <span>Plan · <b className="font-medium text-[var(--color-ink-2)]">idx(date) + memory</b></span>
              <span>Matched · <b className="font-medium text-[var(--color-ink-2)]">1,204</b></span>
              <span><b className="font-medium text-[var(--color-ink-2)]">12ms</b></span>
            </div>
          </div>

          {/* text */}
          <div className="r rd1 order-1 max-w-[440px] lg:order-2">
            <div className="mono mb-5 flex items-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
              <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
              <span>FIG 0.3 · Query</span>
            </div>
            <h3
              className="font-semibold text-[var(--color-ink)]"
              style={{
                fontSize: "clamp(26px, 3.4vw, 44px)",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
              }}
            >
              MongoDB-style queries.
              <br className="hidden sm:block" />
              Index-aware plans.
            </h3>
            <p className="mt-5 max-w-[480px] text-[15px] leading-[1.6] text-[var(--color-ink-dim)] sm:text-[16.5px]">
              One JSON document —{" "}
              <span className="mono text-[var(--color-ink)]">store · filter · project · sort · limit</span>.
              Equality and range filters are served from IndexedDB indexes automatically; the plan is visible live.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function renderLine(n: number, content: React.ReactNode) {
  return (
    <div>
      <span className="mr-3 inline-block w-[22px] text-right text-[11px] text-[var(--color-ink-faint)]">{n}</span>
      {content}
      {"\n"}
    </div>
  );
}

const K = ({ children }: { children: React.ReactNode }) => (
  <span className="font-medium text-[#A5C2E8]">{children}</span>
);
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#E6A3D7]">{children}</span>
);
const N = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#F3C19B]">{children}</span>
);
const O = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#C5B5FD]">{children}</span>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--color-ink-mute)]">{children}</span>
);
