"use client";

import dynamic from "next/dynamic";

// Arena uses socket.io — must be client-only
const ArenaRoom = dynamic(() => import("@/components/ArenaRoom"), { ssr: false });

export default function ArenaPage() {
  return <ArenaRoom />;
}
