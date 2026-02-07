"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Plus, Trash2, Save, ArrowLeft, Box, Clock, Globe } from "lucide-react";
import Link from "next/link";
import MapWrapper from "../components/MapWrapper";
import ShippingRoutePanel from "./ShippingRoutePanel";

export default function RouteEditorPage() {
    return (
        <div className="flex h-screen flex-col bg-black text-white selection:bg-zinc-800 selection:text-zinc-100 overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Map Panel (Left) */}
                <div className="flex-1 relative bg-zinc-900 border-r border-zinc-800">
                    <MapWrapper />

                    {/* Overlay Title for Map Context */}
                    <div className="absolute top-4 left-14 z-[1000] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg px-4 py-2 shadow-xl">
                        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Global Logistics View
                        </h2>
                    </div>
                </div>

                {/* Editor Panel (Right) */}
                <ShippingRoutePanel />
            </div>
        </div>
    );
}
