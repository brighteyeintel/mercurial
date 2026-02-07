import MapWrapper from '../components/MapWrapper';

export default function MercurialPage() {
    return (
        <main className="flex min-h-screen flex-col bg-zinc-950">
            <div className="flex-1 w-full relative z-0">
                <MapWrapper />
            </div>
        </main>
    );
}
