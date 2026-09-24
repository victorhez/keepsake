export interface CardTheme {
  id: string;
  label: string;
  /** Printed on the card. */
  greeting: string;
  background: string;
  ink: string;
  soft: string;
  accent: string;
  pattern: "rings" | "confetti" | "stars" | "waves" | "sprigs" | "grid";
}

export const THEMES: CardTheme[] = [
  {
    id: "birthday",
    label: "Birthday",
    greeting: "Many happy returns",
    background: "radial-gradient(120% 90% at 0% 0%, #FFB199 0%, transparent 55%), radial-gradient(90% 80% at 100% 100%, #FF4F5E 0%, transparent 60%), linear-gradient(135deg, #FF7A59 0%, #F2476A 100%)",
    ink: "#2A0B10",
    soft: "rgba(42,11,16,0.62)",
    accent: "#FFF1E6",
    pattern: "confetti",
  },
  {
    id: "congrats",
    label: "Congrats",
    greeting: "Here’s to what’s next",
    background: "radial-gradient(100% 80% at 100% 0%, #3E8E63 0%, transparent 60%), radial-gradient(80% 70% at 0% 100%, #0B2A1E 0%, transparent 70%), linear-gradient(140deg, #14432F 0%, #0E2E22 100%)",
    ink: "#F3E9CF",
    soft: "rgba(243,233,207,0.66)",
    accent: "#D9B45A",
    pattern: "rings",
  },
  {
    id: "arrival",
    label: "New arrival",
    greeting: "Welcome to the world",
    background: "radial-gradient(110% 90% at 0% 100%, #C7B8FF 0%, transparent 60%), radial-gradient(90% 90% at 100% 0%, #A8E0FF 0%, transparent 65%), linear-gradient(160deg, #DCD3FF 0%, #BFE3FA 100%)",
    ink: "#1B1A3A",
    soft: "rgba(27,26,58,0.6)",
    accent: "#FFFFFF",
    pattern: "stars",
  },
  {
    id: "thanks",
    label: "Thank you",
    greeting: "With gratitude",
    background: "radial-gradient(110% 90% at 100% 100%, #C4552F 0%, transparent 60%), linear-gradient(150deg, #F1DDC3 0%, #E5B98E 100%)",
    ink: "#3A1D0E",
    soft: "rgba(58,29,14,0.62)",
    accent: "#FFF8EE",
    pattern: "waves",
  },
  {
    id: "holiday",
    label: "Holidays",
    greeting: "Season’s greetings",
    background: "radial-gradient(90% 80% at 0% 0%, #B3263E 0%, transparent 60%), radial-gradient(100% 90% at 100% 100%, #0F3B2B 0%, transparent 65%), linear-gradient(135deg, #7A1B2C 0%, #133A2B 100%)",
    ink: "#FBEFDD",
    soft: "rgba(251,239,221,0.66)",
    accent: "#E8C170",
    pattern: "sprigs",
  },
  {
    id: "midnight",
    label: "Just because",
    greeting: "Thinking of you",
    background: "radial-gradient(90% 90% at 100% 0%, #3A3F8F 0%, transparent 60%), radial-gradient(80% 80% at 0% 100%, #6B3E1F 0%, transparent 65%), linear-gradient(150deg, #15162B 0%, #0B0B14 100%)",
    ink: "#F4EEE2",
    soft: "rgba(244,238,226,0.62)",
    accent: "#E3B866",
    pattern: "grid",
  },
];

export function themeById(id: string | undefined): CardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
