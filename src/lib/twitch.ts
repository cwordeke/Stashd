let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTwitchAccessToken(): Promise<string> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url.toString(), { method: "POST" });

  if (!res.ok) {
    throw new Error(`Twitch auth failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export function getTwitchClientId(): string {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing TWITCH_CLIENT_ID");
  }
  return clientId;
}
