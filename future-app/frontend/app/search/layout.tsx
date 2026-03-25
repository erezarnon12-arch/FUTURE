import MainSidebar from "@/components/ui/MainSidebar";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <MainSidebar />
      <div className="flex-1 md:mr-60 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
