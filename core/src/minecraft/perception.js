/**
 * Mineflayer bot durumunu, LLM'e gönderilecek kısa ve anlaşılır bir
 * özete indirger. Ham oyun state'i çok büyük ve gürültülü olduğu
 * için burada sadece ajanın karar vermesi için gereken bilgiler
 * seçiliyor.
 */

const NEARBY_RADIUS = 16; // blok cinsinden algılama yarıçapı
const MAX_NEARBY_ENTITIES = 8;
const MAX_NEARBY_BLOCKS_PER_TYPE = 5;

/**
 * @param {import("mineflayer").Bot} bot
 * @returns {object} LLM'e JSON olarak gönderilecek durum özeti
 */
export function perceive(bot) {
  return {
    position: roundPosition(bot.entity.position),
    health: bot.health,
    food: bot.food,
    timeOfDay: describeTime(bot.time.timeOfDay),
    inventory: summarizeInventory(bot),
    nearbyEntities: summarizeNearbyEntities(bot),
    nearbyBlocksOfInterest: summarizeInterestingBlocks(bot),
    lastChatMessages: bot._recentChat || [],
  };
}

function roundPosition(pos) {
  return { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) };
}

function describeTime(ticks) {
  // Minecraft günü 24000 tick; 0 = şafak, 12000 = gün batımı civarı
  if (ticks < 1000) return "sabah erken";
  if (ticks < 6000) return "gündüz";
  if (ticks < 12000) return "öğleden sonra";
  if (ticks < 13800) return "akşam";
  if (ticks < 22000) return "gece";
  return "gece geç saat";
}

function summarizeInventory(bot) {
  const items = bot.inventory.items();
  const grouped = {};
  for (const item of items) {
    grouped[item.name] = (grouped[item.name] || 0) + item.count;
  }
  return grouped;
}

function summarizeNearbyEntities(bot) {
  const selfId = bot.entity.id;
  const entities = Object.values(bot.entities)
    .filter((e) => e.id !== selfId && e.position)
    .map((e) => ({
      type: e.type, // "player" | "mob" | "object" ...
      name: e.name || e.username || "bilinmeyen",
      distance: Math.round(bot.entity.position.distanceTo(e.position)),
    }))
    .filter((e) => e.distance <= NEARBY_RADIUS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_NEARBY_ENTITIES);

  return entities;
}

function summarizeInterestingBlocks(bot) {
  // İlgi çekici blok türleri — ihtiyaca göre config'den de gelebilir,
  // şimdilik en yaygın kullanılan hedefler sabit tutuluyor.
  const interestingBlockNames = [
    "oak_log", "birch_log", "spruce_log", // ağaçlar
    "coal_ore", "iron_ore", "diamond_ore", // madenler
    "water", "lava",
    "crafting_table", "furnace", "chest",
  ];

  const result = {};

  for (const blockName of interestingBlockNames) {
    const blockType = bot.registry?.blocksByName?.[blockName];
    if (!blockType) continue;

    const positions = bot.findBlocks({
      matching: blockType.id,
      maxDistance: NEARBY_RADIUS,
      count: MAX_NEARBY_BLOCKS_PER_TYPE,
    });

    if (positions.length > 0) {
      result[blockName] = positions.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
      }));
    }
  }

  return result;
}
