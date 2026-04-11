import { useEffect, useState } from "react";
import { useAppDataStore, SEED_ADMIN, DEFAULT_CITIES } from "./useAppDataStore";
import { createClient } from "@/lib/supabase/client";

export function useGlobalSync() {
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function fetchInitialData() {
      try {
        setIsSyncing(true);

        const [
          { data: users },
          { data: cities },
          { data: userCities },
          { data: vmVlAssignments },
          { data: validationRequests },
        ] = await Promise.all([
          supabase.from("app_users").select("*"),
          supabase.from("app_cities").select("*"),
          supabase.from("app_user_cities").select("*"),
          supabase.from("app_vm_vl_assignments").select("*"),
          supabase.from("app_validation_requests").select("*"),
        ]);

        if (!isMounted) return;

        if (users) {
          const hasAdmin = users.some((u) => u.email === SEED_ADMIN.email);
          if (!hasAdmin) {
            users.unshift(SEED_ADMIN);
          }
          useAppDataStore.setState({ users });
        }
        if (cities) {
          if (cities.length === 0) {
            cities.push(...DEFAULT_CITIES);
          }
          useAppDataStore.setState({ cities });
        }
        if (userCities) useAppDataStore.setState({ userCities });
        if (vmVlAssignments) useAppDataStore.setState({ vmVlAssignments });
        if (validationRequests) {
          useAppDataStore.setState({
            validationRequests: validationRequests.map((r) => r.data),
          });
        }
      } catch (err) {
        console.error("Failed to sync from Supabase:", err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    }

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isSyncing };
}
