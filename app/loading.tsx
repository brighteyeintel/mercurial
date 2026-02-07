import { Truck } from "lucide-react";

export default function LoadingPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm gap-5">
      <Truck className="h-12 w-12 text-white animate-spin" />
      <p className="text-white font-mono uppercase tracking-wider">Loading...</p>
    </div>
  );
}
