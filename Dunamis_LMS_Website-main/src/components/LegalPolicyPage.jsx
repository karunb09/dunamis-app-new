const Section = ({ title, children }) => (
  <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
    {title ? <h2 className="text-lg font-semibold text-gray-950">{title}</h2> : null}
    <div className="mt-3 space-y-3 text-sm leading-7 text-gray-700 md:text-base">
      {children}
    </div>
  </section>
);

const BulletList = ({ items }) => (
  <ul className="list-disc space-y-3 pl-5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function LegalPolicyPage({
  title,
  updatedAt,
  intro,
  downloadHref,
  downloadLabel = "Download PDF",
  children,
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_34%),linear-gradient(180deg,#fff7ed_0%,#ffffff_40%,#f8fafc_100%)] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-[0_24px_80px_-42px_rgba(234,88,12,0.45)] backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
            Dunamis Music Private Limited
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-semibold text-gray-500">
            Last updated on {updatedAt}
          </p>
          {intro ? (
            <p className="mt-6 text-base leading-8 text-gray-700">{intro}</p>
          ) : null}
          {downloadHref ? (
            <a
              href={downloadHref}
              download
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#fd5a1f]"
            >
              {downloadLabel}
            </a>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">{children}</div>
      </div>
    </main>
  );
}

export { BulletList, Section };
