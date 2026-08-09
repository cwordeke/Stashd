"use client";

import Image from "next/image";
import ProfileBio from "@/components/ProfileBio";
import Top4Shelf from "@/components/Top4Shelf";
import { useStash } from "@/context/StashContext";
import { type MediaType, type StashShelves } from "@/lib/types";

const GRID_TYPES: MediaType[] = ["movie", "tv", "game", "book"];

interface PublicProfileViewProps {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  shelves: StashShelves;
  isOwner: boolean;
}

export default function PublicProfileView({
  username,
  avatarUrl,
  bio,
  shelves,
  isOwner,
}: PublicProfileViewProps) {
  const { shelves: optimisticShelves } = useStash();

  // Owners see optimistic shelves so add/remove updates instantly
  const displayShelves = isOwner ? optimisticShelves : shelves;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col items-center text-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${username}'s avatar`}
            width={96}
            height={96}
            className="rounded-full border border-zinc-700 shadow-lg shadow-black/40"
            priority
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 text-3xl font-semibold text-white shadow-lg shadow-black/40">
            {username.charAt(0).toUpperCase()}
          </span>
        )}

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {username}
        </h1>

        <div className="mt-3 w-full">
          <ProfileBio
            initialBio={bio}
            isOwner={isOwner}
            username={username}
          />
        </div>
      </header>

      <section className="space-y-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          {GRID_TYPES.map((type) => (
            <Top4Shelf
              key={type}
              type={type}
              items={displayShelves[type]}
              editable={isOwner}
            />
          ))}
        </div>

        <div className="mx-auto w-full md:max-w-[calc(50%-1rem)]">
          <Top4Shelf
            type="music"
            items={displayShelves.music}
            editable={isOwner}
          />
        </div>
      </section>
    </div>
  );
}
