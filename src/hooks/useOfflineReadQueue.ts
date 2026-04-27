import { useEffect, useState } from "react";
import { subscribeOfflineQueue } from "@/lib/messageReadEvents";

/** Subscribe to the offline "messages-read" queue size for UI banners. */
export function useOfflineReadQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => subscribeOfflineQueue(setPendingCount), []);
  return pendingCount;
}
