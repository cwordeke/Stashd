"use client";

import { useEffect, useState } from "react";
import ActivityFeed from "@/components/ActivityFeed";
import { getSocialFeed, type FeedItem } from "@/app/actions/feed";

const POLL_INTERVAL_MS = 30_000;

interface ActivityFeedPanelProps {
  initialItems: FeedItem[];
  signedIn: boolean;
}

export default function ActivityFeedPanel({
  initialItems,
  signedIn,
}: ActivityFeedPanelProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    async function refresh() {
      try {
        const next = await getSocialFeed();
        if (!cancelled) setItems(next);
      } catch {
        // Keep showing the last good feed on transient failures.
      }
    }

    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [signedIn]);

  return <ActivityFeed items={items} signedIn={signedIn} />;
}
