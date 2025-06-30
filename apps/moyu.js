import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

// 鱼的品种及其大小和重量范围，并增加权重和价格倍率
const fishTypes = [
  { name: '鲫鱼',    minLen: 10, maxLen: 30, minW: 0.2, maxW: 1,   weight: 30, priceRate: 1.0 }, // 常见
  { name: '鲤鱼',    minLen: 20, maxLen: 60, minW: 0.5, maxW: 3,   weight: 20, priceRate: 1.2 },
  { name: '草鱼',    minLen: 30, maxLen: 80, minW: 1,   maxW: 6,   weight: 15, priceRate: 1.1 },
  { name: '锦鲤',    minLen: 15, maxLen: 50, minW: 0.3, maxW: 2,   weight: 8,  priceRate: 2.0 }, // 贵
  { name: '胖头鱼',  minLen: 25, maxLen: 70, minW: 1,   maxW: 5,   weight: 10, priceRate: 1.3 },
  { name: '鲈鱼',    minLen: 15, maxLen: 40, minW: 0.3, maxW: 1.5, weight: 8,  priceRate: 1.5 },
  { name: '猫猫鱼',  minLen: 10, maxLen: 25, minW: 0.2, maxW: 0.8, weight: 5,  priceRate: 2.5 }, // 稀有
  { name: '金龙鱼',  minLen: 40, maxLen: 100,minW: 2,   maxW: 10,  weight: 3,  priceRate: 5.0 }, // 极稀有
  { name: '神秘鱼',  minLen: 50, maxLen: 120,minW: 5,   maxW: 20,  weight: 1,  priceRate: 10.0 }, // 传说
  { name: '几把鱼',  minLen: 5,  maxLen: 15, minW: 0.1, maxW: 0.5, weight: 1, priceRate: 0.1 } // 隐藏
];

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

    // 自动恢复体力（重写后）
    recoverStamina(userData[userId]);

    // 体力不足
    if (userData[userId].stamina <= 0) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply('你已经没有体力了，休息一会儿再来摸鱼吧~', false, { at: true });
    }

    // 按权重随机选择鱼的品种
    const totalWeight = fishTypes.reduce((sum, fish) => sum + fish.weight, 0);
    let rand = Math.random() * totalWeight;
    let fish;
    for (let i = 0; i < fishTypes.length; i++) {
      rand -= fishTypes[i].weight;
      if (rand <= 0) {
        fish = fishTypes[i];
        break;
      }
    }
    if (!fish) fish = fishTypes[0];

    // 随机生成鱼的长度和重量
    const length = (Math.random() * (fish.maxLen - fish.minLen) + fish.minLen).toFixed(1);
    const weight = (Math.random() * (fish.maxW - fish.minW) + fish.minW).toFixed(2);

    // 喵喵币奖励 = (长度*2 + 重量*10) * 价格倍率，向下取整，最少1个
    let fishCoins = Math.floor((length * 2 + weight * 10) * fish.priceRate);
    if (fishCoins < 1) fishCoins = 1;

    let staminaCost = (
      Math.pow(Number(length), 0.8) +       // 长度影响（边际递减）
      Math.pow(Number(weight), 2.2) * 2.2 + // 重量影响（更陡峭）
      fish.priceRate * 5                    // 稀有度附加
    );

    // 引入 0.85 - 1.25 波动范围（±20%）
    staminaCost *= 0.85 + Math.random() * 0.4;

    // 限制范围：最少 20，最多 120
    staminaCost = Math.max(20, Math.min(120, Math.round(staminaCost)));


    if (userData[userId].stamina < staminaCost) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`你本次摸鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`, false, { at: true });
    }

    // 抓鱼成功后增加次数
    userData[userId].coins += fishCoins;
    userData[userId].stamina -= staminaCost;
    userData[userId].catchFishCount += 1; // 增加统计

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

    while (stamina >= 20) {
      // 这里改为 let，避免重复声明
      let totalFishWeight = fishTypes.reduce((sum, fish) => sum + fish.weight, 0);
      let rand = Math.random() * totalFishWeight;
      let fish;
      for (let i = 0; i < fishTypes.length; i++) {
        rand -= fishTypes[i].weight;
        if (rand <= 0) {
          fish = fishTypes[i];
          break;
        }
      }
      if (!fish) fish = fishTypes[0];

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

      if (stamina < staminaCost || stamina < 20) {
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

    if (totalCount === 0) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply('你当前体力不足以摸一次鱼哦~', false, { at: true });
    }

    userData[userId].coins += totalCoins;
    userData[userId].stamina -= totalStaminaCost;
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
      totalStaminaCost,
      stamina: userData[userId].stamina
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