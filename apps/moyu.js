import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

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
  { name: '神秘鱼',  minLen: 50, maxLen: 120,minW: 5,   maxW: 20,  weight: 1,  priceRate: 10.0 } // 传说
];

// 体力恢复相关设置
const MAX_STAMINA = 100;
const RECOVER_INTERVAL = 60 * 1000; // 每分钟恢复
const RECOVER_AMOUNT = 5; // 每分钟恢复1点

export class moyu extends plugin {
  constructor() {
    super({
      name: '摸鱼',
      dsc: '摸鱼插件',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#*摸鱼$',
          fnc: 'moyu'
        },
        {
          reg: '^#*体力$',
          fnc: 'stamina'
        }
      ]
    })
  }

  // 体力自动恢复逻辑
  recoverStamina(user) {
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
    const recoverPoints = Math.floor(elapsed / RECOVER_INTERVAL) * RECOVER_AMOUNT;
    if (recoverPoints > 0) {
      user.stamina = Math.min(MAX_STAMINA, user.stamina + recoverPoints);
      user.lastStaminaTime += recoverPoints * RECOVER_INTERVAL;
    }
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
        lastStaminaTime: Date.now()
      };
    }
    if (typeof userData[userId].stamina !== 'number') {
      userData[userId].stamina = MAX_STAMINA;
    }
    if (!userData[userId].lastStaminaTime) {
      userData[userId].lastStaminaTime = Date.now();
    }

    // 自动恢复体力
    this.recoverStamina(userData[userId]);

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

    // 体力消耗 = 长度/10 + 重量*2，向上取整，最少1点
    let staminaCost = Math.ceil(Number(length) / 10 + Number(weight) * 2);
    if (staminaCost < 1) staminaCost = 1;

    if (userData[userId].stamina < staminaCost) {
      fs.writeFileSync(dataPath, yaml.stringify(userData));
      return e.reply(`你本次摸鱼需要消耗${staminaCost}点体力，但你当前体力不足，鱼跑掉了！`, false, { at: true });
    }

    userData[userId].coins += fishCoins;
    userData[userId].stamina -= staminaCost;

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    return e.reply(
      `你摸到了一条【${fish.name}】\n长度：${length}cm\n重量：${weight}kg\n售出获得了${fishCoins}个喵喵币！\n本次消耗体力${staminaCost}，当前体力${userData[userId].stamina}`,
      false,
      { at: true }
    );
  }

  async stamina(e) {
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
        lastStaminaTime: Date.now()
      };
    }
    if (typeof userData[userId].stamina !== 'number') {
      userData[userId].stamina = MAX_STAMINA;
    }
    if (!userData[userId].lastStaminaTime) {
      userData[userId].lastStaminaTime = Date.now();
    }

    // 自动恢复体力
    this.recoverStamina(userData[userId]);

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    return e.reply(`你当前体力为：${userData[userId].stamina} / ${MAX_STAMINA}`, false, { at: true });
  }
}