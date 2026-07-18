"use client";

import type { MediaItem } from "@/lib/types";

interface MediaItemRowProps {
  item: MediaItem;
}

export default function MediaItemRow({ item }: MediaItemRowProps) {
  return (
    <li
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid #ddd",
        listStyle: "none",
      }}
    >
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail}
          alt=""
          width={46}
          height={46}
          style={{
            objectFit: "cover",
            flexShrink: 0,
            background: "#eee",
          }}
        />
      ) : (
        <div
          style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            background: "#eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            color: "#888",
          }}
        >
          N/A
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, wordBreak: "break-word" }}>
          {item.title}
        </div>
        <div style={{ fontSize: "0.85rem", color: "#555" }}>
          {item.creator}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#777" }}>{item.year}</div>
      </div>
    </li>
  );
}
