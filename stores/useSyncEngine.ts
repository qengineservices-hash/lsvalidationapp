import { useEffect, useState } from "react";
import { useAppDataStore } from "./useAppDataStore";
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

        if (users) useAppDataStore.setState({ users });
        if (cities) useAppDataStore.setState({ cities });
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
