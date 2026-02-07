import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "lucide-react";

export default function AccountPage() {
    return (
        <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
            <Navbar />
            <main className="flex-1">
                {/* Account Page */}
                <div className="flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-zinc-100 bg-clip-text text-transparent uppercase font-sans text-shadow-[0_0_20px_black]">Account</h1>
                </div>
            </main>
            <Footer />
        </div>
    );
}