import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

export class nekologin extends plugin {
  constructor() {
    super({
      name: '寻喵签到',
      dsc: '寻喵签到功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#*签到$',
          fnc: 'nekologin'
        },
        {
          reg: '^#*我的信息$',
          fnc: 'info'
        }
      ]
    });
  }

  async nekologin(e) {
    const userId = `${e.user_id}`;
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');

    let userData = {};
    let coinsChange = 0;
    let coins = 0;
    let favorabilityChange = 0;
    let favorability = 0;
    let luck = Math.floor(Math.random() * 102);
    let rp = '';
    let sgined = '';
    let dailySignOrder = 1;
    let totalSignCount = 0;

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, yaml.stringify({}));
    }

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    userData = yaml.parse(fileContent) || {};

    if (!userData.dailySignOrder) {
      userData.dailySignOrder = {};
    }

    if (!userData.dailySignOrder[today]) {
      userData.dailySignOrder[today] = 1;
    } else {
      userData.dailySignOrder[today]++;
    }
    dailySignOrder = userData.dailySignOrder[today];

    if (!userData[userId]) {
      userData[userId] = {
        coins: 0,
        favorability: 0,
        bank: 0,
        totalSignCount: 0,
        continueSignCount: 0 // 新增字段
      };
    }

    if (typeof userData[userId].totalSignCount === 'undefined' || isNaN(userData[userId].totalSignCount)) {
      userData[userId].totalSignCount = 0;
    }
    if (typeof userData[userId].continueSignCount === 'undefined' || isNaN(userData[userId].continueSignCount)) {
      userData[userId].continueSignCount = 0;
    }
    totalSignCount = userData[userId].totalSignCount;
    let continueSignCount = userData[userId].continueSignCount;

    // 获取昨天日期字符串
    function getYesterdayStr() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    }

    if (userData[userId] && userData[userId].lastSignIn === today) {
      sgined = '今日已签到';
      coins = userData[userId].coins;
      favorability = userData[userId].favorability;
      luck = userData[userId].luck;
      rp = userData[userId].rp;
      coinsChange = userData[userId].coinsChange;
      favorabilityChange = userData[userId].favorabilityChange;
      dailySignOrder = userData[userId].dailySignOrder;
      totalSignCount = userData[userId].totalSignCount;
      continueSignCount = userData[userId].continueSignCount;
    } else {
      const maxCoins = 50;
      const maxFavorability = 3;

      sgined = '签到成功！';
      totalSignCount += 1;

      // 判断是否连续签到
      if (userData[userId].lastSignIn === getYesterdayStr()) {
        continueSignCount += 1;
      } else {
        continueSignCount = 1;
      }

      if (luck == 101) {
        favorabilityChange = 10;
        coinsChange = 100;
        coins = userData[userId].coins + coinsChange;
        favorability = userData[userId].favorability + favorabilityChange;
      } else {
        coinsChange = Math.round(maxCoins * (luck / 100));
        favorabilityChange = Math.round(maxFavorability * (luck / 100));
        coins = userData[userId].coins + coinsChange;
        favorability = userData[userId].favorability + favorabilityChange;
      }

      const luckMessages = [
        { range: [0, 0], message: 'QAQ...寻喵不是故意的...' },
        { range: [1, 19], message: '运势很差呢，摸摸...' },
        { range: [20, 39], message: '运势欠佳哦，一定会好起来的！' },
        { range: [40, 59], message: '运势普普通通，不好也不坏噢~' },
        { range: [60, 79], message: '运势不错~会有什么好事发生吗？' },
        { range: [80, 89], message: '运势旺盛！今天是个好日子~' },
        { range: [90, 99], message: '好运爆棚！一定会有好事发生吧！' },
        { range: [100, 100], message: '100！今天说不定能发大财！！！' },
        { range: [101, 101], message: '999！是隐藏的999运势！', overrideLuck: 999 }
      ];

      for (const luckMessage of luckMessages) {
        if (luck >= luckMessage.range[0] && luck <= luckMessage.range[1]) {
          rp = luckMessage.message;
          if (luckMessage.overrideLuck) {
            luck = luckMessage.overrideLuck;
          }
          break;
        }
      }

      if (favorability > 100) {
        favorability = 100;
      }

      userData[userId] = {
        ...userData[userId],
        lastSignIn: today,
        luck: luck,
        rp: rp,
        coins: coins,
        coinsChange: coinsChange,
        favorability: favorability,
        favorabilityChange: favorabilityChange,
        dailySignOrder: dailySignOrder,
        totalSignCount: totalSignCount,
        continueSignCount: continueSignCount // 保存连续签到天数
      };

      fs.writeFileSync(dataPath, yaml.stringify(userData));
    }

    let touxiang = Bot.pickUser(this.e.user_id).getAvatarUrl();
    let serder = e.sender;
    let id = serder.card;

    const data = {
      luck,
      rp,
      favorability,
      coins,
      coinsChange,
      favorabilityChange,
      sgined,
      id,
      touxiang,
      dailySignOrder,
      totalSignCount,
      continueSignCount // 传递到模板
    };

    console.log(data);

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'login',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/login/login.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/login/login.css`,
      data: data,
      waitForSelector: '.user-avatar img',
      waitForFunction: `
        (selector) => {
          const img = document.querySelector(selector);
          return img && img.complete && img.naturalWidth > 0;
        }
      `,
      waitForFunctionArgs: ['.user-avatar img']
    });

    return await e.reply(base64);
  }

  async info(e) {
    const userId = `${e.user_id}`;

    let userData = {};
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      userData = yaml.parse(fileContent) || {};
    }

    let { favorability = 0, coins = 0, bank = 0, totalSignCount = 0 } = userData[userId] || {};

    if (typeof totalSignCount === 'undefined' || isNaN(totalSignCount)) {
      totalSignCount = 0;
    }

    return this.reply(`好感度：${favorability}\n喵喵币：${coins}\n银行存款：${bank}\n累计签到：${totalSignCount}天`, false, { at: true });
  }
}
