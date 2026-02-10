import AdminView from "@/components/AdminView";
import { Toaster } from "@/components/ui/sonner";

export default function AdminPage() {
    return (
        <main className="min-h-screen">
            <AdminView />
            <Toaster />
        </main>
    );
}
