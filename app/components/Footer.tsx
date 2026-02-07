
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full border-t border-zinc-900 bg-zinc-950 py-12 md:py-16 lg:py-20 text-zinc-400 relative">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-zinc-100 uppercase font-mono tracking-wider">Mercurial</h3>
                        <p className="text-sm leading-relaxed">
                            Intelligent logistics suite for the modern world. Identify risks, monitor traffic, and optimize supply chains.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-zinc-100 uppercase tracking-wider">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="#" className="hover:text-white transition-colors">
                                    Overview
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-white transition-colors">
                                    Features
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-900 pt-8 sm:flex-row text-xs text-zinc-600 font-mono">
                    <p>&copy; {new Date().getFullYear()} Mercurial Inc. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
