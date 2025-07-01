import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import axios from 'axios'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;
const itemsPath = `${_path}/plugins/xunmiao-plugin/config/items.yaml`;
const MAX_STAMINA = 200;
const MAX_STAMINA_OVERFLOW = 999999999; // 新增，供物品使用时参考
const RECOVER_INTERVAL = 60 * 1000;
const RECOVER_AMOUNT = 5;

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

export class info extends plugin {
  constructor() {
    super({
      name: '我的信息',
      dsc: '个人信息查询',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#(我的信息|个人信息)$',
          fnc: 'info'
        }
      ]
    });
  }

  async info(e) {
    const userId = `${e.user_id}`;

    let userData = {};
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      userData = yaml.parse(fileContent) || {};
    }

    // 自动恢复体力
    if (userData[userId]) {
      recoverStamina(userData[userId]);
      fs.writeFileSync(dataPath, yaml.stringify(userData));
    }

    let {
      favorability = 0,
      coins = 0,
      bank = 0,
      totalSignCount = 0,
      continueSignCount = 0,
      stamina = 100,
      catchFishCount = 0
    } = userData[userId] || {};

    if (typeof totalSignCount === 'undefined' || isNaN(totalSignCount)) {
      totalSignCount = 0;
    }
    if (typeof continueSignCount === 'undefined' || isNaN(continueSignCount)) {
      continueSignCount = 0;
    }
    if (typeof stamina !== 'number') {
      stamina = 100;
    }
    if (typeof catchFishCount !== 'number') {
      catchFishCount = 0;
    }

    // 新增：查询装备信息
    const invData = getInvData();
    const shopItems = getShopItems();
    const equipData = getEquipData(userId, invData);
    let equipMsg = '';
    if (equipData) {
      if (equipData.rod) {
        const rod = shopItems.find(i => i.id === equipData.rod);
        if (rod) equipMsg += `鱼竿：${rod.name}\n`;
      }
      if (equipData.bait) {
        const bait = shopItems.find(i => i.id === equipData.bait);
        if (bait) equipMsg += `鱼饵：${bait.name}\n`;
      }
      if (equipData.glove) {
        const glove = shopItems.find(i => i.id === equipData.glove);
        if (glove) equipMsg += `手套：${glove.name}\n`;
      }
    }
    if (!equipMsg) equipMsg = '无';

    let touxiangUrl = Bot.pickUser(this.e.user_id).getAvatarUrl();
    let touxiang = '';
    try {
      const response = await axios.get(touxiangUrl, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mime = response.headers['content-type'] || 'image/png';
      touxiang = `data:${mime};base64,${base64}`;
    } catch (err) {
      console.error('头像获取失败:', err);
      touxiang = '';
    }

    let serder = e.sender;
    let id = serder.card;

    const data = {
      favorability,
      coins,
      bank,
      totalSignCount,
      continueSignCount,
      stamina,
      catchFishCount,
      id,
      touxiang,
      equipMsg // 新增：装备信息
    };

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'info',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/info/info.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/info/info.css`,
      data: data
    });

    // 文本模式下也显示装备信息
    let textInfo = `喵喵币：${coins}\n好感度：${favorability}\n银行存款：${bank}\n累计签到：${totalSignCount}天\n连续签到：${continueSignCount}天\n体力：${stamina} / 200\n摸鱼次数：${catchFishCount}次`;
    if (equipMsg) textInfo += `\n${equipMsg}`;
    return await e.reply(base64, false, { at: true });
  }
}