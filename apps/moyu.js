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

// 体力恢复相关设置
const MAX_STAMINA = 200;
const MAX_STAMINA_OVERFLOW = 999999999; // 新增，供物品使用时参考
const RECOVER_INTERVAL = 60 * 1000; // 每分钟恢复
const RECOVER_AMOUNT = 5; // 每分钟恢复1点

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
  // 计算距离上次更新时间过去了多少分钟
  const elapsed = now - user.lastStaminaTime;
  const recoverTimes = Math.floor(elapsed / RECOVER_INTERVAL);
  if (recoverTimes > 0) {
    user.stamina = Math.min(MAX_STAMINA, user.stamina + recoverTimes * RECOVER_AMOUNT);
    user.lastStaminaTime += recoverTimes * RECOVER_INTERVAL;
    // 防止 lastStaminaTime 超过 now
    if (user.lastStaminaTime > now) user.lastStaminaTime = now;
  }
}

function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
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

export class moyu extends plugin {
  constructor() {
    super({
      name: '摸鱼',
      dsc: '摸鱼插件',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#摸鱼$',
          fnc: 'moyu'
        },
        {
          reg: '^#连续摸鱼$',
          fnc: 'multiMoyu'
        }
      ]
    })
  }

  async moyu(e) {
    const userId = `${e.user_id}`;
    let userData = {};

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, yaml.stringify({}));
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    userData = yaml.parse(fileContent) || {};

    // 获取装备
    const invData = getInvData();
    const equipData = getEquipData(userId, invData);

    // 获取装备概率加成
    let baseRate = 0.25;
    const shopItems = getShopItems();
    const gloveItem = shopItems.find(i => i.id === equipData.glove);
    if (gloveItem && gloveItem.use && gloveItem.use.type === 'moyu_glove') {
      // 直接读取 probability_bonus 字段
      baseRate += gloveItem.probability_bonus ?? 0;
    }

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
    if (userData[userId].stamina <= 0) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply('你已经没有体力了，休息一会儿再来摸鱼吧~', false, { at: true });
    }

    // 概率判定
    if (Math.random() > baseRate) {
      userData[userId].stamina -= 10; // 摸鱼失败也消耗10点体力
      if (userData[userId].stamina < 0) userData[userId].stamina = 0;
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`很遗憾，什么都没摸到，消耗10点体力，当前体力${userData[userId].stamina}`, false, { at: true });
    }

    const fishTypes = getFishTypes();
    // 摸到鱼后再随机种类
    const fish = fishTypes[Math.floor(Math.random() * fishTypes.length)];
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
      return e.reply(`你本次摸鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`, false, { at: true });
    }

    userData[userId].coins += fishCoins;
    userData[userId].stamina -= staminaCost;
    userData[userId].catchFishCount += 1;

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    return e.reply(
      `你摸到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n售出获得了${fishCoins}个喵喵币！\n本次消耗体力${staminaCost}，当前体力${userData[userId].stamina}`,
      false,
      { at: true }
    );
  }

  async multiMoyu(e) {
    const userId = `${e.user_id}`;
    let userData = {};

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, yaml.stringify({}));
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    userData = yaml.parse(fileContent) || {};

    // 获取装备
    const invData = getInvData();
    const equipData = getEquipData(userId, invData);

    // 获取装备概率加成
    let baseRate = 0.25;
    const shopItems = getShopItems();
    const gloveItem = shopItems.find(i => i.id === equipData.glove);
    if (gloveItem && gloveItem.use && gloveItem.use.type === 'moyu_glove') {
      // 直接读取 probability_bonus 字段
      baseRate += gloveItem.probability_bonus ?? 0;
    }

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

    recoverStamina(userData[userId]);

    if (userData[userId].stamina <= 0) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply('你已经没有体力了，休息一会儿再来摸鱼吧~', false, { at: true });
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

    const fishTypes = getFishTypes();
    while (stamina >= 10) {
      // 概率判定
      if (Math.random() > baseRate) {
        stamina -= 10;
        if (stamina < 0) stamina = 0;
        emptyCount++;
        fishList.push(`很遗憾，什么都没摸到，消耗10点体力，当前体力${stamina}`);
        continue;
      }

      // 摸到鱼后再随机种类
      const fish = fishTypes[Math.floor(Math.random() * fishTypes.length)];
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
        fishList.push(`你本次摸鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`);
        break;
      }

      stamina -= staminaCost;
      totalStaminaCost += staminaCost;
      totalCoins += fishCoins;
      totalCount += 1;

      fishList.push(`你摸到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n获得${fishCoins}喵喵币，消耗体力${staminaCost}`);

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
      return e.reply('你当前体力不足以摸一次鱼哦~', false, { at: true });
    }

    userData[userId].coins += totalCoins;
    userData[userId].stamina -= totalStaminaCost + emptyCount * 10;
    if (userData[userId].stamina < 0) userData[userId].stamina = 0;
    userData[userId].catchFishCount += totalCount;

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    // 渲染统计表图片
    const summaryArr = Object.entries(fishSummary).map(([name, stat]) => ({
      name,
      count: stat.count,
      coins: stat.coins,
      length: stat.length.toFixed(1),
      weight: stat.weight.toFixed(2)
    }));

    const summaryData = {
      list: summaryArr,
      totalCount,
      totalCoins,
      totalLength: totalLength.toFixed(1),
      totalWeight: totalWeight.toFixed(2),
      totalStaminaCost: totalStaminaCost + emptyCount * 10,
      stamina: userData[userId].stamina,
      emptyCount // 新增：摸空次数
    };

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'moyu_summary',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/moyu/moyu_summary.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/moyu/moyu_summary.css`,
      data: summaryData
    });

    return e.reply(base64, false, { at: true });
  }
}