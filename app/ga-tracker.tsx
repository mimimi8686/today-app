"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/gtag";
import { Suspense } from "react";

function InnerTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

export default function GATracker() {
  return (
    <Suspense fallback={null}>
      <InnerTracker />
    </Suspense>
  );
}
