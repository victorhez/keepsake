import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

async function googleFont(family: string, text: string, weight = 400): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return src ? await (await fetch(src)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

function Bow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="3" y="9" width="26" height="20" rx="5" fill="#17140f" />
      <rect x="14" y="9" width="4" height="20" fill="#e8492e" />
      <rect x="3" y="15" width="26" height="3.5" fill="#e8492e" />
      <path d="M16 9.5c-2.2-4.6-7.6-6.3-8.6-3.4-.9 2.6 4.1 3.8 8.6 3.4Z" fill="#e8492e" />
      <path d="M16 9.5c2.2-4.6 7.6-6.3 8.6-3.4.9 2.6-4.1 3.8-8.6 3.4Z" fill="#e8492e" />
      <circle cx="16" cy="9.4" r="1.9" fill="#c13a22" />
    </svg>
  );
}

function Card({ greeting, line, value, bg, ink, rotate, top, left }: { greeting: string; line: string; value: string; bg: string; ink: string; rotate: number; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: 520,
        height: 328,
        borderRadius: 30,
        background: bg,
        color: ink,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 40px 80px -30px rgba(23,20,15,0.55)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 34,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Serif", fontSize: 28 }}>Keepsake</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Serif", fontSize: 46, lineHeight: 1 }}>{greeting}</div>
        <div style={{ fontSize: 20, marginTop: 8, opacity: 0.7 }}>{line}</div>
      </div>
      <div style={{ fontFamily: "Serif", fontSize: 54 }}>{value}</div>
    </div>
  );
}

export async function renderOg({ eyebrow, title }: { eyebrow: string; title: string }) {
  const text = `${eyebrow}${title}KeepsakeMany happy returnsHere’s to what’s next$50.00$250.00a piece of NVIDIAa piece of Anthropic`;
  const [serif, sans] = await Promise.all([googleFont("Instrument Serif", text), googleFont("Inter", text, 500)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f5f0e7",
          fontFamily: "Sans",
          color: "#17140f",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Bow size={44} />
            <div style={{ fontFamily: "Serif", fontSize: 40 }}>Keepsake</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: "#7d7466" }}>{eyebrow}</div>
            <div style={{ fontFamily: "Serif", fontSize: 84, lineHeight: 0.98, marginTop: 18, letterSpacing: -1 }}>{title}</div>
          </div>
        </div>
        <Card
          greeting="Here’s to what’s next"
          line="a piece of Anthropic"
          value="$250.00"
          bg="linear-gradient(140deg, #14432F 0%, #0E2E22 100%)"
          ink="#F3E9CF"
          rotate={8}
          top={90}
          left={690}
        />
        <Card
          greeting="Many happy returns"
          line="a piece of NVIDIA"
          value="$50.00"
          bg="linear-gradient(135deg, #FF7A59 0%, #F2476A 100%)"
          ink="#2A0B10"
          rotate={-5}
          top={250}
          left={620}
        />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        ...(serif ? [{ name: "Serif", data: serif, style: "normal" as const, weight: 400 as const }] : []),
        ...(sans ? [{ name: "Sans", data: sans, style: "normal" as const, weight: 500 as const }] : []),
      ],
    },
  );
}
