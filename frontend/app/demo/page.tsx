import { ModernSidebar } from "@/components/ui/modern-sidebar";

export default function DemoPage() {
  return (
    <div className="flex h-screen bg-white">
      <ModernSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Demo Page</h1>
        <p className="text-slate-600">This is a demo page with the modern sidebar.</p>
      </div>
    </div>
  );
}
