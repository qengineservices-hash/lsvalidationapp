"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      router.replace(ROLE_DASHBOARD[currentUser.role]);
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, currentUser, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-livspace-gray-400 font-bold">
        Redirecting...
      </div>
    </div>
  );
}
