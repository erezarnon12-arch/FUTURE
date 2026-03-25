import Sidebar from "@/components/ui/Sidebar";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clientId: string };
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar clientId={parseInt(params.clientId)} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
