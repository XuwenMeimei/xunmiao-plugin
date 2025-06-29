import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import axios from 'axios'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const MAX_STAMINA = 100;
const MAX_STAMINA_OVERFLOW = 500; // 新增，供物品使用时参考
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
      touxiang
    };

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'info',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/info/info.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/info/info.css`,
      data: data
    });

    return await e.reply(base64);
  }
}