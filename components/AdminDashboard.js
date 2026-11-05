"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const TZ = "Africa/Lagos";
const PAGE_SIZE = 25;

const naira = (kobo) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", {
        timeZone: TZ,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

// Lets "0803…", "803…", "234803…" and "+234803…" all find the same person.
function phoneVariants(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  const out = [digits];
  if (digits.startsWith("234")) out.push("0" + digits.slice(3), digits.slice(3));
  return out.join(" ");
}

function haystack(s) {
  return [
    s.name,
    s.email,
    s.whatsapp,
    phoneVariants(s.whatsapp),
    s.refCode || "",
    s.reference,
    s.status === "PAID" ? "paid" : "pending unpaid",
  ]
    .join(" ")
    .toLowerCase();
}

// Stops spreadsheet apps from running a name like "=HYPERLINK(...)" as a formula.
function csvCell(value) {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
}

function downloadCsv(rows) {
  const header = ["Name", "Email", "WhatsApp", "Status", "Amount (NGN)", "Referral", "Joined", "Paid at", "Reference"];
  const lines = rows.map((s) =>
    [
      s.name,
      s.email,
      s.whatsapp,
      s.status,
      s.status === "PAID" ? s.amountKobo / 100 : 0,
      s.refCode || "",
      fmtDateTime(s.createdAt),
      fmtDateTime(s.paidAt),
      s.reference,
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `students-${dayKey(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={"adm-kpi" + (tone ? ` adm-kpi-${tone}` : "")}>
      <div className="adm-kpi-label">{label}</div>
      <div className="adm-kpi-value">{value}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard({ signups, courseTitle, generatedAt }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const paid = signups.filter((s) => s.status === "PAID");
    const pending = signups.filter((s) => s.status !== "PAID");
    const revenue = paid.reduce((sum, s) => sum + s.amountKobo, 0);
    const pendingValue = pending.reduce((sum, s) => sum + s.amountKobo, 0);

    const today = dayKey(new Date().toISOString());
    const weekAgo = Date.now() - 7 * 86400000;
    const paidToday = paid.filter((s) => dayKey(s.paidAt || s.createdAt) === today);
    const paidWeek = paid.filter((s) => new Date(s.paidAt || s.createdAt).getTime() >= weekAgo);

    // Last 30 days, stacked: paid vs not-yet-paid, by the day the person signed up.
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * 86400000).toISOString());
      days.push({ key, paid: 0, pending: 0 });
    }
    const index = Object.fromEntries(days.map((d, i) => [d.key, i]));
    for (const s of signups) {
      const i = index[dayKey(s.createdAt)];
      if (i !== undefined) days[i][s.status === "PAID" ? "paid" : "pending"]++;
    }

    // Per referral code (influencer / partner).
    const byRef = {};
    for (const s of signups) {
      const key = s.refCode || "(direct)";
      byRef[key] ||= { ref: key, signups: 0, paid: 0, revenue: 0 };
      byRef[key].signups++;
      if (s.status === "PAID") {
        byRef[key].paid++;
        byRef[key].revenue += s.amountKobo;
      }
    }
    const refs = Object.values(byRef).sort((a, b) => b.paid - a.paid || b.signups - a.signups);

    return {
      total: signups.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      revenue,
      pendingValue,
      conversion: signups.length ? (paid.length / signups.length) * 100 : 0,
      paidToday: paidToday.length,
      revenueToday: paidToday.reduce((sum, s) => sum + s.amountKobo, 0),
      paidWeek: paidWeek.length,
      revenueWeek: paidWeek.reduce((sum, s) => sum + s.amountKobo, 0),
      emailsMissing: paid.filter((s) => !s.emailSent).length,
      days,
      maxDay: Math.max(1, ...days.map((d) => d.paid + d.pending)),
      refs,
    };
  }, [signups]);

  const indexed = useMemo(() => signups.map((s) => ({ s, h: haystack(s) })), [signups]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = indexed
      .filter(({ s, h }) => (status === "ALL" || (status === "PAID") === (s.status === "PAID")) && tokens.every((t) => h.includes(t)))
      .map(({ s }) => s);
    if (sort === "oldest") list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "paid") list.sort((a, b) => (b.paidAt || "").localeCompare(a.paidAt || ""));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [indexed, query, status, sort]);

  const shown = results.slice(0, visible);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <main className="adm-wrap">
      <header className="adm-header">
        <div>
          <h1>{courseTitle}</h1>
          <p className="adm-muted">Dashboard · updated {fmtDateTime(generatedAt)}</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="adm-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="adm-kpis">
        <Kpi label="Revenue" value={naira(stats.revenue)} sub={`${stats.paidCount} paid × ${naira(stats.paidCount ? stats.revenue / stats.paidCount : 0)}`} tone="green" />
        <Kpi label="Paid students" value={stats.paidCount} sub={`${stats.paidToday} today · ${stats.paidWeek} in 7 days`} />
        <Kpi label="Total signups" value={stats.total} sub="Everyone who filled the form" />
        <Kpi label="Not paid yet" value={stats.pendingCount} sub={`${naira(stats.pendingValue)} waiting to be won`} tone="amber" />
        <Kpi label="Conversion" value={stats.conversion.toFixed(1) + "%"} sub="Signups that paid" />
        <Kpi label="Today" value={naira(stats.revenueToday)} sub={`Last 7 days: ${naira(stats.revenueWeek)}`} />
      </section>

      {stats.emailsMissing > 0 && (
        <div className="adm-alert">
          {stats.emailsMissing} paid student{stats.emailsMissing === 1 ? "" : "s"} did not get the confirmation email
          (check your Resend setup). They can still use the WhatsApp link on the success page.
        </div>
      )}

      <section className="adm-grid">
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Signups per day</h2>
            <div className="adm-legend">
              <span><i className="dot dot-paid" /> Paid</span>
              <span><i className="dot dot-pending" /> Not paid</span>
            </div>
          </div>
          <div className="adm-bars" role="img" aria-label="Signups per day for the last 30 days">
            {stats.days.map((d) => {
              const total = d.paid + d.pending;
              return (
                <div key={d.key} className="adm-bar-col" title={`${d.key}: ${d.paid} paid, ${d.pending} not paid`}>
                  <div className="adm-bar" style={{ height: `${(total / stats.maxDay) * 100}%` }}>
                    <div className="adm-seg-pending" style={{ flex: d.pending }} />
                    <div className="adm-seg-paid" style={{ flex: d.paid }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="adm-axis">
            <span>{stats.days[0].key}</span>
            <span>{stats.days[stats.days.length - 1].key}</span>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h2>By referral link</h2>
          </div>
          <div className="adm-scroll">
            <table className="adm-table adm-table-compact">
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="num">Signups</th>
                  <th className="num">Paid</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.refs.map((r) => (
                  <tr key={r.ref} className="adm-click" onClick={() => setQuery(r.ref === "(direct)" ? "" : r.ref)}>
                    <td>{r.ref}</td>
                    <td className="num">{r.signups}</td>
                    <td className="num">{r.paid}</td>
                    <td className="num">{naira(r.revenue)}</td>
                  </tr>
                ))}
                {stats.refs.length === 0 && (
                  <tr><td colSpan={4} className="adm-muted">No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Students <span className="adm-count">{results.length}</span></h2>
          <button className="adm-btn" onClick={() => downloadCsv(results)} disabled={!results.length}>
            Download CSV
          </button>
        </div>

        <div className="adm-toolbar">
          <input
            type="search"
            className="adm-input adm-search"
            placeholder="Search name, email, WhatsApp, referral code, reference…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
          />
          <div className="adm-tabs" role="tablist">
            {[
              ["ALL", `All (${stats.total})`],
              ["PAID", `Paid (${stats.paidCount})`],
              ["PENDING", `Not paid (${stats.pendingCount})`],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={status === key}
                className={"adm-tab" + (status === key ? " active" : "")}
                onClick={() => {
                  setStatus(key);
                  setVisible(PAGE_SIZE);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <select className="adm-input adm-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest signups</option>
            <option value="oldest">Oldest signups</option>
            <option value="paid">Recently paid</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th className="num">Amount</th>
                <th>Referral</th>
                <th>Joined</th>
                <th>Paid at</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td className="adm-strong">{s.name}</td>
                  <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                  <td>
                    <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      {s.whatsapp}
                    </a>
                  </td>
                  <td>
                    <span className={"adm-pill " + (s.status === "PAID" ? "adm-pill-paid" : "adm-pill-pending")}>
                      {s.status === "PAID" ? "Paid" : "Not paid"}
                    </span>
                  </td>
                  <td className="num">{s.status === "PAID" ? naira(s.amountKobo) : "—"}</td>
                  <td>{s.refCode || <span className="adm-muted">direct</span>}</td>
                  <td className="nowrap">{fmtDateTime(s.createdAt)}</td>
                  <td className="nowrap">{fmtDateTime(s.paidAt)}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="adm-empty">
                    {signups.length === 0 ? "No signups yet." : "No one matches that search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {results.length > shown.length && (
          <div className="adm-more">
            <button className="adm-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({results.length - shown.length} left)
            </button>
            <button className="adm-btn" onClick={() => setVisible(results.length)}>Show all</button>
          </div>
        )}
      </section>
    </main>
  );
}