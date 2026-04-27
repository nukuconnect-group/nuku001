import { CloudOff, RefreshCw } from "lucide-react";
import { useOfflineReadQueue } from "@/hooks/useOfflineReadQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Small inline banner shown in the chat area when "messages-read"
 * updates are queued locally and waiting for connection to sync.
 */
export default function OfflineReadIndicator() {
  const pending = useOfflineReadQueue();
  const online = useOnlineStatus();

  if (pending === 0 && online) return null;

  const syncing = online && pending > 0;

  return (
    <div
      data-testid="offline-read-indicator"
      className="mx-auto max-w-md px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2 shadow-sm"
    >
      {syncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Synchronisation des messages lus…</span>
        </>
      ) : (
        <>
          <CloudOff className="w-3.5 h-3.5" />
          <span>
            Hors ligne — {pending > 0 ? `${pending} mise${pending > 1 ? "s" : ""} à jour « lu »` : "lectures"} en attente, sync à la reconnexion
          </span>
        </>
      )}
    </div>
  );
}
