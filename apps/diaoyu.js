import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;
const itemsPath = `${_path}/plugins/xunmiao-plugin/config/items.yaml`;
const fishTypesPath = `${_path}/plugins/xunmiao-plugin/config/fish_types.yaml`;

// 加载鱼种配置
function getFishTypes() {
  if (!fs.existsSync(fishTypesPath)) return [];
  const content = fs.readFileSync(fishTypesPath, 'utf8');
  return yaml.parse(content) || [];
}

function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
}
function getUserData() {
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(dataPath, 'utf8')) || {};
}
function getShopItems() {
  if (!fs.existsSync(itemsPath)) return [];
  const content = fs.readFileSync(itemsPath, 'utf8');
  return yaml.parse(content) || [];
}
function getEquipData(userId, invData) {
  if (!invData[userId] || !invData[userId]._equip) {
    if (!invData[userId]) invData[userId] = {};
    invData[userId]._equip = {};
  }
  return invData[userId]._equip;
}

const MAX_STAMINA = 200;
const RECOVER_INTERVAL = 60 * 1000;
const RECOVER_AMOUNT = 5;

// 体力自动恢复逻辑（只能恢复到100）
function recoverStamina(user) {
  const now = Date.now();
  if (!user.lastStaminaTime) {
    user.lastStaminaTime = now;
    return;
  }
  if (user.stamina >= MAX_STAMINA) {
    user.lastStaminaTime = now;
    return;
  }
  const elapsed = now - user.lastStaminaTime;
  const recoverTimes = Math.floor(elapsed / RECOVER_INTERVAL);
  if (recoverTimes > 0) {
    user.stamina = Math.min(MAX_STAMINA, user.stamina + recoverTimes * RECOVER_AMOUNT);
    user.lastStaminaTime += recoverTimes * RECOVER_INTERVAL;
    if (user.lastStaminaTime > now) user.lastStaminaTime = now;
  }
}

export class diaoyu extends plugin {
  constructor() {
    super({
      name: '钓鱼',
      dsc: '钓鱼插件',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#钓鱼$',
          fnc: 'diaoyu'
        },
        {
          reg: '^#连续钓鱼$',
          fnc: 'multiDiaoyu'
        }
      ]
    })
  }

  async diaoyu(e) {
    const userId = `${e.user_id}`;
    let userData = getUserData();
    let invData = getInvData();
    let shopItems = getShopItems();

    if (!userData[userId]) {
      userData[userId] = {
        coins: 0,
        favorability: 0,
        bank: 0,
        totalSignCount: 0,
        continueSignCount: 0,
        stamina: MAX_STAMINA,
        lastStaminaTime: Date.now(),
        catchFishCount: 0
      };
    }
    if (typeof userData[userId].stamina !== 'number') {
      userData[userId].stamina = MAX_STAMINA;
    }
    if (!userData[userId].lastStaminaTime) {
      userData[userId].lastStaminaTime = Date.now();
    }
    if (typeof userData[userId].catchFishCount !== 'number') {
      userData[userId].catchFishCount = 0;
    }

    // 自动恢复体力
    recoverStamina(userData[userId]);

    // 体力不足
    if (userData[userId].stamina < 20) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply('你体力不足，无法钓鱼！', false, { at: true });
    }

    // 检查装备
    let equipData = getEquipData(userId, invData);
    let rodEquipped = equipData.rod;
    let baitEquipped = equipData.bait;

    // 必须同时装备鱼竿和鱼饵
    if (!rodEquipped && !baitEquipped) {
      return e.reply('你没有装备鱼竿和鱼饵，无法钓鱼！请先在背包中装备。', false, { at: true });
    }
    if (!rodEquipped) {
      return e.reply('你没有装备鱼竿，无法钓鱼！请先在背包中装备鱼竿。', false, { at: true });
    }
    if (!baitEquipped) {
      return e.reply('你没有装备鱼饵，无法钓鱼！请先在背包中装备鱼饵。', false, { at: true });
    }

    // 检查背包鱼饵数量
    if (!invData[userId][baitEquipped] || invData[userId][baitEquipped] <= 0) {
      return e.reply('你的鱼饵已经用完了，请补充后再钓鱼！', false, { at: true });
    }

    // 每次钓鱼消耗一个鱼饵
    invData[userId][baitEquipped]--;
    fs.writeFileSync(invDataPath, yaml.stringify(invData));

    // 钓鱼概率：以鱼竿配置为主
    let fishRate = 0;
    const rodItem = shopItems.find(i => i.id === rodEquipped && i.category === 'rod');
    if (rodItem && typeof rodItem.probability !== 'undefined') {
      fishRate = Number(rodItem.probability);
    }

    // 钓鱼判定
    if (Math.random() > fishRate) {
      userData[userId].stamina -= 20;
      if (userData[userId].stamina < 0) userData[userId].stamina = 0;
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`钓了半天什么都没钓到，消耗20点体力和1个鱼饵，当前体力${userData[userId].stamina}`, false, { at: true });
    }

    // 加载鱼种
    const fishTypes = getFishTypes();

    function buildFishPool(fishTypes, filterFn) {
      let pool = [];
      fishTypes.forEach(f => {
        if (!filterFn || filterFn(f)) {
          for (let i = 0; i < (f.weight || 1); i++) {
            pool.push(f);
          }
        }
      });
      return pool;
    }

    let fishPool;
    if (baitEquipped === 5) {
      fishPool = buildFishPool(fishTypes, f => f.normal);
    } else if (baitEquipped === 6) {
      fishPool = buildFishPool(fishTypes, f => f.normal || (!f.normal && f.weight > 0));
    } else if (baitEquipped === 7) {
      fishPool = buildFishPool(fishTypes, f => f.normal || (!f.normal && f.weight > 0));
    } else if (baitEquipped === 8) {
      fishPool = buildFishPool(fishTypes, f => !f.normal && f.weight > 0);
    } else {
      fishPool = buildFishPool(fishTypes);
    }

    const fish = fishPool[Math.floor(Math.random() * fishPool.length)];
    const length = (Math.random() * (fish.maxLen - fish.minLen) + fish.minLen).toFixed(1);
    const weight = (Math.random() * (fish.maxW - fish.minW) + fish.minW).toFixed(2);

    let fishCoins = Math.floor((length * 2 + weight * 10) * fish.priceRate);
    if (fishCoins < 1) fishCoins = 1;

    let staminaCost = (
      Math.pow(Number(length), 0.8) +
      Math.pow(Number(weight), 2.2) * 2.2 +
      fish.priceRate * 5
    );
    staminaCost *= 0.85 + Math.random() * 0.4;
    staminaCost = Math.max(20, Math.min(120, Math.round(staminaCost)));

    if (userData[userId].stamina < staminaCost) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`你本次钓鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`, false, { at: true });
    }

    userData[userId].coins += fishCoins;
    userData[userId].stamina -= staminaCost;
    userData[userId].catchFishCount += 1;

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    return e.reply(
      `你钓到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n售出获得了${fishCoins}个喵喵币！\n本次消耗体力${staminaCost}和1个鱼饵，当前体力${userData[userId].stamina}`,
      false,
      { at: true }
    );
  }

  async multiDiaoyu(e) {
    const userId = `${e.user_id}`;
    let userData = getUserData();
    let invData = getInvData();
    let shopItems = getShopItems();

    if (!userData[userId]) {
        userData[userId] = {
            coins: 0,
            favorability: 0,
            bank: 0,
            totalSignCount: 0,
            continueSignCount: 0,
            stamina: MAX_STAMINA,
            lastStaminaTime: Date.now(),
            catchFishCount: 0
        };
    }
    if (typeof userData[userId].stamina !== 'number') {
        userData[userId].stamina = MAX_STAMINA;
    }
    if (!userData[userId].lastStaminaTime) {
        userData[userId].lastStaminaTime = Date.now();
    }
    if (typeof userData[userId].catchFishCount !== 'number') {
        userData[userId].catchFishCount = 0;
    }

    // 自动恢复体力
    recoverStamina(userData[userId]);

    // 检查装备
    let equipData = getEquipData(userId, invData);
    let rodEquipped = equipData.rod;
    let baitEquipped = equipData.bait;

    // 必须同时装备鱼竿和鱼饵
    if (!rodEquipped && !baitEquipped) {
        return e.reply('你没有装备鱼竿和鱼饵，无法钓鱼！请先在背包中装备。', false, { at: true });
    }
    if (!rodEquipped) {
        return e.reply('你没有装备鱼竿，无法钓鱼！请先在背包中装备鱼竿。', false, { at: true });
    }
    if (!baitEquipped) {
        return e.reply('你没有装备鱼饵，无法钓鱼！请先在背包中装备鱼饵。', false, { at: true });
    }

    // 检查背包鱼饵数量
    if (!invData[userId][baitEquipped] || invData[userId][baitEquipped] <= 0) {
        return e.reply('你的鱼饵已经用完了，请补充后再钓鱼！', false, { at: true });
    }

    // 钓鱼概率：以鱼竿配置为主
    let fishRate = 0;
    const rodItem = shopItems.find(i => i.id === rodEquipped && i.category === 'rod');
    if (rodItem && typeof rodItem.probability !== 'undefined') {
      fishRate = Number(rodItem.probability);
    }

    let stamina = userData[userId].stamina;
    let totalCoins = 0;
    let totalCount = 0;
    let fishList = [];
    let totalStaminaCost = 0;
    let fishSummary = {};
    let totalLength = 0;
    let totalWeight = 0;
    let emptyCount = 0;
    let baitCount = invData[userId][baitEquipped];

    const fishTypes = getFishTypes();

    // 构建概率鱼池工具函数
    function buildFishPool(fishTypes, filterFn) {
        let pool = [];
        fishTypes.forEach(f => {
            if (!filterFn || filterFn(f)) {
                for (let i = 0; i < (f.weight || 1); i++) {
                    pool.push(f);
                }
            }
        });
        return pool;
    }

    // 预先构建鱼池，避免每次循环都构建
    let fishPool;
    if (baitEquipped === 5) {
        fishPool = buildFishPool(fishTypes, f => f.normal);
    } else if (baitEquipped === 6) {
        fishPool = buildFishPool(fishTypes, f => f.normal || (!f.normal && f.weight > 0));
    } else if (baitEquipped === 7) {
        fishPool = buildFishPool(fishTypes, f => f.normal || (!f.normal && f.weight > 0));
    } else if (baitEquipped === 8) {
        fishPool = buildFishPool(fishTypes, f => !f.normal && f.weight > 0);
    } else {
        fishPool = buildFishPool(fishTypes);
    }

    while (stamina >= 20 && baitCount > 0) {
        // 每次消耗一个鱼饵
        baitCount--;
        invData[userId][baitEquipped]--;

        // 钓鱼判定
        if (Math.random() > fishRate) {
            stamina -= 20;
            if (stamina < 0) stamina = 0;
            emptyCount++;
            fishList.push(`钓了半天什么都没钓到，消耗20点体力和1个鱼饵，当前体力${stamina}`);
            continue;
        }

        const fish = fishPool[Math.floor(Math.random() * fishPool.length)];
        const length = (Math.random() * (fish.maxLen - fish.minLen) + fish.minLen).toFixed(1);
        const weight = (Math.random() * (fish.maxW - fish.minW) + fish.minW).toFixed(2);

        let fishCoins = Math.floor((length * 2 + weight * 10) * fish.priceRate);
        if (fishCoins < 1) fishCoins = 1;

        let staminaCost = (
            Math.pow(Number(length), 0.8) +
            Math.pow(Number(weight), 2.2) * 2.2 +
            fish.priceRate * 5
        );
        staminaCost *= 0.85 + Math.random() * 0.4;
        staminaCost = Math.max(20, Math.min(120, Math.round(staminaCost)));

        if (stamina < staminaCost) {
            fishList.push(`你本次钓鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`);
            break;
        }

        stamina -= staminaCost;
        totalStaminaCost += staminaCost;
        totalCoins += fishCoins;
        totalCount += 1;

        fishList.push(`你钓到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n获得${fishCoins}喵喵币，消耗体力${staminaCost}和1个鱼饵`);

        // 统计
        if (!fishSummary[fish.name]) {
            fishSummary[fish.name] = {
                count: 0,
                coins: 0,
                length: 0,
                weight: 0
            };
        }
        fishSummary[fish.name].count += 1;
        fishSummary[fish.name].coins += fishCoins;
        fishSummary[fish.name].length += Number(length);
        fishSummary[fish.name].weight += Number(weight);

        totalLength += Number(length);
        totalWeight += Number(weight);
    }

    if (totalCount === 0 && emptyCount === 0) {
        fs.writeFileSync(dataPath, yaml.stringify(userData));
        return e.reply('你当前体力或鱼饵不足以钓一次鱼哦~', false, { at: true });
    }

    userData[userId].coins += totalCoins;
    userData[userId].stamina -= totalStaminaCost + emptyCount * 20;
    if (userData[userId].stamina < 0) userData[userId].stamina = 0;
    userData[userId].catchFishCount += totalCount;

    // 更新鱼饵数量
    invData[userId][baitEquipped] = baitCount;
    fs.writeFileSync(dataPath, yaml.stringify(userData));
    fs.writeFileSync(invDataPath, yaml.stringify(invData));

    // 渲染统计表图片
    const summaryArr = Object.entries(fishSummary).map(([name, stat]) => ({
        name,
        count: stat.count,
        coins: stat.coins,
        length: stat.length.toFixed(1),
        weight: stat.weight.toFixed(2)
    }));

    // 统计本次消耗的鱼饵数量和名称
    const baitUsed = invData[userId][baitEquipped] !== undefined
        ? (invData[userId][baitEquipped] + totalCount + emptyCount) - baitCount
        : totalCount + emptyCount;
    const baitItem = shopItems.find(i => i.id === baitEquipped);
    const baitName = baitItem ? baitItem.name : `#${baitEquipped}`;

    const summaryData = {
        list: summaryArr,
        totalCount,
        totalCoins,
        totalLength: totalLength.toFixed(1),
        totalWeight: totalWeight.toFixed(2),
        totalStaminaCost: totalStaminaCost + emptyCount * 20,
        stamina: userData[userId].stamina,
        emptyCount,
        baitUsed: totalCount + emptyCount,
        baitName
    };

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
        saveId: 'diaoyu_summary',
        imgType: 'png',
        tplFile: `${_path}/plugins/xunmiao-plugin/res/diaoyu/diaoyu_summary.html`,
        pluginResources: `${_path}/plugins/xunmiao-plugin/res/diaoyu/diaoyu_summary.css`,
        data: summaryData
    });

    return e.reply(base64, false, { at: true });
}
}