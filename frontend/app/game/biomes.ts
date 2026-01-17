export type Biome = {
  id: string;
  name: string;
  image: string;
  effect: "forest" | "ice" | "lava" | "shadow";
};

export const BIOMES: Biome[] = [
  {
    id: "forest-ruins",
    name: "Forest Ruins",
    image: "/biomes/forest.jpg",
    effect: "forest",
  },
  {
    id: "ice-temple",
    name: "Ice Temple",
    image: "/biomes/ice.png",
    effect: "ice",
  },
  {
    id: "lava-cavern",
    name: "Lava Cavern",
    image: "/biomes/lava.png",
    effect: "lava",
  },
  {
    id: "shadow-fortress",
    name: "Shadow Fortress",
    image: "/biomes/shadow.png",
    effect: "shadow",
  },
];
