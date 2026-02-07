import Navbar from '../components/Navbar';
import DynamicMap from './DynamicMap';

export default function CurrentThreatPage() {
    return (
        <main className="flex min-h-screen flex-col bg-zinc-950">
            <Navbar />
            <div className="flex-1 w-full relative z-0">
                <DynamicMap />
            </div>
        </main>
    );
}

