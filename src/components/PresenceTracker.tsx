import { usePresenceTracker } from "@/hooks/usePresence";

/**
 * Invisible component that tracks user presence. Mount once in App.
 */
const PresenceTracker = () => {
  usePresenceTracker();
  return null;
};

export default PresenceTracker;
