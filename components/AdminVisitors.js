"use client";

import { useState } from "react";

const RANGES = [
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
  [0, "All time"],
];

const num = (n) => Number(n || 0).toLocaleString("en-NG");

function Kpi({ label, value, sub }) {
  return (
    <div className="adm-kpi">
      <div className="adm-kpi-label">{label}</div>
      <div className="adm-kpi-value">{value}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
    </div>
  );
}

function Breakdown({ title, rows, empty = "No data yet." }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <div className="adm-card">
      <div className="adm-card-head">
        <h2>{title}</h2>
        <span className="adm-muted adm-small">Visitors</span>
      </div>
      {rows.length === 0 ? (
        <p className="adm-muted adm-small">{empty}</p>
      ) : (
        <ul className="adm-brk">
          {rows.map((r) => (
            <li key={r.label} className="adm-brk-row">
              <div className="adm-brk-bar" style={{ width: `${(r.visitors / max) * 100}%` }} />
              <span className="adm-brk-label">{r.label}</span>
              <span className="adm-brk-val">{num(r.visitors)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminVisitors({ initial }) {
  const [data, setData] = useState(initial);
  const [range, setRange] = useState(initial?.range ?? 30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(days) {
    setRange(days);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/visits?days=${days}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || "Could not load visitor stats.");
      else setData(json);
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  if (!data) {
    return (
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Visitors</h2>
        </div>
        <p className="adm-muted adm-small">
          Visitor tracking isn&apos;t ready yet. Run <code>npx prisma db push</code> to create the <code>Visit</code> table,
          then redeploy.
        </p>
      </section>
    );
  }

  const maxDay = Math.max(1, ...data.series.map((d) => d.visitors));
  const noData = data.views === 0;

  return (
    <>
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Visitors</h2>
          <div className="adm-tabs" role="tablist">
            {RANGES.map(([d, label]) => (
              <button
                key={d}
                role="tab"
                aria-selected={range === d}
                className={"adm-tab" + (range === d ? " active" : "")}
                onClick={() => load(d)}
                disabled={loading}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="adm-alert" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="adm-kpis" style={{ opacity: loading ? 0.5 : 1 }}>
          <Kpi label="Unique visitors" value={num(data.visitors)} sub="Different people (by device)" />
          <Kpi label="Page views" value={num(data.views)} sub="Total pages opened" />
          <Kpi label="Visitors today" value={num(data.visitorsToday)} sub="Since midnight, Lagos time" />
          <Kpi label="Countries" value={num(data.countryCount)} sub="Where visitors are from" />
        </div>

        {noData ? (
          <p className="adm-muted adm-small" style={{ marginTop: 14 }}>
            No visits recorded for this period yet. Open the live site in another browser and refresh this page.
          </p>
        ) : (
          <>
            <div className="adm-bars" style={{ marginTop: 16 }} role="img" aria-label="Unique visitors per day">
              {data.series.map((d) => (
                <div key={d.day} className="adm-bar-col" title={`${d.day}: ${d.visitors} visitors, ${d.views} views`}>
                  <div className="adm-bar" style={{ height: `${(d.visitors / maxDay) * 100}%` }}>
                    <div className="adm-seg-paid" style={{ flex: 1 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="adm-axis">
              <span>{data.series[0].day}</span>
              <span>{data.series[data.series.length - 1].day}</span>
            </div>
          </>
        )}
      </section>

      {!noData && (
        <section className="adm-grid-2">
          <Breakdown title="Top countries" rows={data.countries} />
          <Breakdown title="Top cities" rows={data.cities} empty="No city data yet." />
          <Breakdown title="Where they came from" rows={data.referrers} />
          <Breakdown title="Devices" rows={data.devices} />
        </section>
      )}
    </>
  );
}