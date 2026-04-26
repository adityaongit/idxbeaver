"use client";

import { useEffect } from "react";
import { seedDemoData, shouldAutoSeed } from "@/lib/demo-seed";

export function DemoSeeder() {
  useEffect(() => {
    const { run, force } = shouldAutoSeed();
    if (!run) return;
    seedDemoData(force).catch((err) => {
      console.warn("[idxbeaver] demo seed failed:", err);
    });
  }, []);
  return null;
}
