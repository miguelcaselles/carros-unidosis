import TechnicianView from "@/components/TechnicianView";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="min-h-screen">
      <TechnicianView />
      <Toaster />
    </main>
  );
}
