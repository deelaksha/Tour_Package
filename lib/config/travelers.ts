export type HairStyle = "short" | "long" | "bun" | "cap" | "beanie" | "curly";
export type Accessory = "backpack" | "camera" | "scarf" | "headphones" | "duffel";

export interface TravelerLook {
  id: string;
  skin: string;
  top: string;
  /** Secondary jacket/trim colour. */
  trim: string;
  bottom: string;
  shoes: string;
  hair: string;
  hairStyle: HairStyle;
  accessories: Accessory[];
  /** Overall height multiplier. */
  scale: number;
  /** Shoulder / torso width multiplier. */
  build: number;
  skirt?: boolean;
  /** Dance style used at the celebration (0–3). */
  dance: number;
}

export const TRAVELERS: TravelerLook[] = [
  { id: "aarav", skin: "#8d5a3b", top: "#19c6e6", trim: "#0b3d52", bottom: "#1d2433", shoes: "#e9eef5", hair: "#16110e", hairStyle: "cap", accessories: ["backpack"], scale: 1.02, build: 1.05, dance: 0 },
  { id: "meera", skin: "#b07a52", top: "#f2a14a", trim: "#7a3b16", bottom: "#2b2338", shoes: "#3a2b25", hair: "#1b1210", hairStyle: "long", accessories: ["scarf"], scale: 0.95, build: 0.92, dance: 1 },
  { id: "kabir", skin: "#6e4630", top: "#7b5cff", trim: "#2a1f66", bottom: "#151a24", shoes: "#9aa5b8", hair: "#0d0b0a", hairStyle: "beanie", accessories: ["headphones"], scale: 1.07, build: 1.0, dance: 2 },
  { id: "zoya", skin: "#c38d66", top: "#eef3f8", trim: "#5fd1ff", bottom: "#33405a", shoes: "#f4f4f4", hair: "#2a1a12", hairStyle: "bun", accessories: ["camera"], scale: 0.97, build: 0.93, dance: 3 },
  { id: "rohan", skin: "#7d5036", top: "#1fb59a", trim: "#0c4a3f", bottom: "#3b3426", shoes: "#20242c", hair: "#120d0b", hairStyle: "curly", accessories: ["duffel"], scale: 0.99, build: 1.14, dance: 1 },
  { id: "isha", skin: "#a8714d", top: "#ff5d73", trim: "#5a1626", bottom: "#ff5d73", shoes: "#f2d0b8", hair: "#1a100c", hairStyle: "long", accessories: [], scale: 0.94, build: 0.9, skirt: true, dance: 0 },
];
