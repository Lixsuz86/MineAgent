import pathfinderPkg from "mineflayer-pathfinder";
const { Movements, goals } = pathfinderPkg;

/**
 * LLM'den beklenen aksiyon formatı (agent/loop.js bunu LLM'e prompt
 * içinde açıklar):
 *
 * { "action": "goto", "x": 10, "y": 64, "z": -3 }
 * { "action": "say", "text": "Merhaba!" }
 * { "action": "mine", "block": "oak_log", "x": 10, "y": 64, "z": -3 }
 * { "action": "idle" }
 *
 * Her aksiyon burada ayrı bir handler'a düşüyor. Yeni bir aksiyon
 * türü eklemek için ACTION_HANDLERS içine yeni bir case eklemek
 * yeterli.
 */

export async function executeAction(bot, action) {
  const handler = ACTION_HANDLERS[action.action];

  if (!handler) {
    console.warn(`[actions] Bilinmeyen aksiyon: "${action.action}", görmezden geliniyor.`);
    return { ok: false, reason: `bilinmeyen aksiyon: ${action.action}` };
  }

  try {
    await handler(bot, action);
    return { ok: true };
  } catch (err) {
    console.warn(`[actions] "${action.action}" başarısız: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

const ACTION_HANDLERS = {
  async idle() {
    // Bilinçli olarak hiçbir şey yapma.
  },

  async say(bot, action) {
    if (!action.text) throw new Error("say aksiyonu için 'text' gerekli");
    bot.chat(action.text);
  },

  async goto(bot, action) {
    const { x, y, z } = action;
    if ([x, y, z].some((v) => typeof v !== "number")) {
      throw new Error("goto aksiyonu için sayısal x, y, z gerekli");
    }

    const movements = new Movements(bot);
    bot.pathfinder.setMovements(movements);
    const goal = new goals.GoalNear(x, y, z, 1);

    await bot.pathfinder.goto(goal);
  },

  async mine(bot, action) {
    const { x, y, z } = action;
    if ([x, y, z].some((v) => typeof v !== "number")) {
      throw new Error("mine aksiyonu için sayısal x, y, z gerekli");
    }

    const targetBlock = bot.blockAt({ x, y, z });
    if (!targetBlock || targetBlock.name === "air") {
      throw new Error(`(${x}, ${y}, ${z}) konumunda kırılabilir blok yok`);
    }

    // Önce bloğa yaklaş, sonra kır.
    const movements = new Movements(bot);
    bot.pathfinder.setMovements(movements);
    await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2));
    await bot.dig(targetBlock);
  },

  async lookAt(bot, action) {
    const { x, y, z } = action;
    if ([x, y, z].some((v) => typeof v !== "number")) {
      throw new Error("lookAt aksiyonu için sayısal x, y, z gerekli");
    }
    await bot.lookAt({ x, y, z });
  },
};
