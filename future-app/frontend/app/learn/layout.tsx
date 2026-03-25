import MainSidebar from "@/components/ui/MainSidebar";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <div className="flex-1 md:mr-60">
        {children}
      </div>
    </div>
  );
}
