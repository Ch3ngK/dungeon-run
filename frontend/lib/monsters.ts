export const MONSTER_IMAGES = {
  forest: {
    normal: [
      "/monsters/forest/wolf.png",
      "/monsters/forest/treant.png",
      "/monsters/forest/slime.png",
    ],
    boss: "/monsters/forest/boss.png",
  },

  ice: {
    normal: [
      "/monsters/ice/yeti.png",
      "/monsters/ice/spirit.png",
      "/monsters/ice/golem.png",
    ],
    boss: "/monsters/ice/boss.png",
  },

  lava: {
    normal: [
      "/monsters/lava/imp.png",
      "/monsters/lava/elemental.png",
      "/monsters/lava/beast.png",
    ],
    boss: "/monsters/lava/boss.png",
  },

  shadow: {
    normal: [
      "/monsters/shadow/wraith.png",
      "/monsters/shadow/shade.png",
      "/monsters/shadow/knight.png",
    ],
    boss: "/monsters/shadow/boss.png",
  },
} as const;
