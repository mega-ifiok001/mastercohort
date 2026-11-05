import "./admin.css";
import { prisma } from "@/lib/prisma";
import { COURSE } from "@/lib/config";
import { isAdmin, isAdminConfigured } from "@/lib/adminAuth";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="adm-center">
        <div className="adm-login">
          <h1>Admin not set up</h1>
          <p className="adm-muted">
            Add an <code>ADMIN_PASSWORD</code> environment variable (in <code>.env</code> locally, and in Vercel
            for the live site), then restart.
          </p>
        </div>
      </main>
    );
  }

  if (!(await isAdmin())) return <AdminLogin />;

  const rows = await prisma.signup.findMany({ orderBy: { createdAt: "desc" } });

  const signups = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    whatsapp: r.whatsapp,
    refCode: r.refCode,
    reference: r.reference,
    status: r.status,
    amountKobo: r.amountKobo,
    emailSent: Boolean(r.emailSentAt),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <AdminDashboard signups={signups} courseTitle={COURSE.title} generatedAt={new Date().toISOString()} />;
}