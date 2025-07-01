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

    // 没有装备鱼竿无法钓鱼
    if (!rodEquipped) {
      return e.reply('你没有装备鱼竿，无法钓鱼！请先在背包中装备鱼竿。', false, { at: true });
    }

    // 钓鱼概率：以鱼竿配置为主
    let fishRate = 0.25;
    const rodItem = shopItems.find(i => i.id === rodEquipped);
    if (rodItem && rodItem.use && rodItem.use.type === 'diaoyu_rod') {
      const match = rodItem.desc && rodItem.desc.match(/(\d+(\.\d+)?)%/);
      if (match) {
        fishRate = parseFloat(match[1]) / 100;
      } else {
        fishRate = 0.5;
      }
    }

    // 钓鱼判定
    if (Math.random() > fishRate) {
      userData[userId].stamina -= 20;
      if (userData[userId].stamina < 0) userData[userId].stamina = 0;
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`钓了半天什么都没钓到，消耗20点体力，当前体力${userData[userId].stamina}`, false, { at: true });
    }

    // 加载鱼种
    const fishTypes = getFishTypes();

    // 根据鱼饵调整鱼池
    let fishPool = fishTypes;
    if (baitEquipped === 5) {
      // 初级鱼饵：只钓到普通鱼
      fishPool = fishTypes.filter(f => f.normal);
    } else if (baitEquipped === 6) {
      // 中级鱼饵：稀有鱼概率提升（普通+稀有，稀有权重*3）
      fishPool = [];
      fishTypes.forEach(f => {
        if (f.normal) {
          fishPool.push(f);
        } else if (['锦鲤', '猫猫鱼'].includes(f.name)) {
          for (let i = 0; i < 3; i++) fishPool.push(f);
        }
      });
    } else if (baitEquipped === 7) {
      // 高级鱼饵：稀有和传说鱼概率大幅提升（普通+稀有*4+传说*4）
      fishPool = [];
      fishTypes.forEach(f => {
        if (f.normal) {
          fishPool.push(f);
        } else if (['锦鲤', '猫猫鱼'].includes(f.name)) {
          for (let i = 0; i < 4; i++) fishPool.push(f);
        } else if (['金龙鱼', '神秘鱼'].includes(f.name)) {
          for (let i = 0; i < 4; i++) fishPool.push(f);
        }
      });
    } else if (baitEquipped === 8) {
      // 特级鱼饵：只钓稀有、传说、隐藏鱼
      fishPool = fishTypes.filter(f =>
        ['锦鲤', '猫猫鱼', '金龙鱼', '神秘鱼', '几把鱼'].includes(f.name)
      );
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
      `你钓到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n售出获得了${fishCoins}个喵喵币！\n本次消耗体力${staminaCost}，当前体力${userData[userId].stamina}`,
      false,
      { at: true }
    );
  }
}