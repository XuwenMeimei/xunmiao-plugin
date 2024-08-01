import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

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
    })
  }

  async nekologin(e) {
    const userId = `${e.user_id}`;
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    console.log(today);

    let userData = {};

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, yaml.stringify({}));
    }

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    userData = yaml.parse(fileContent) || {};

    if (!userData[userId]) {
      userData[userId] = {
        coins: 0,
        favorability: 0
      };
    }

    if (userData[userId] && userData[userId].lastSignIn === today) {
      const { luck, rp, favorability, coins, favorabilityChange, coinsChange } = userData[userId];
      return this.reply(`你今天已经签到了哦~
你今天获得了${coinsChange}个喵喵币和${favorabilityChange}点好感度
今天的人品是：${luck}
当前好感度：${favorability}
当前喵喵币：${coins}
${rp}`, false, { at: true });
    }

    let luck = Math.floor(Math.random() * 102);

    const maxCoins = 50;
    const maxFavorability = 3;

    let coinsChange;
    let coins;
    let favorabilityChange;
    let favorability;

    if (luck == 101) {
      favorabilityChange = 10;
      coins = 100;
    }else{
      coinsChange = Math.round(maxCoins * (luck / 100));
      favorabilityChange = Math.round(maxFavorability * (luck / 100));
      coins = userData[userId].coins + coinsChange
      favorability = userData[userId].favorability + favorabilityChange;
    }
    
    let rp = '';

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
      lastSignIn: today,
      luck: luck,
      rp: rp,
      coins: coins,
      coinsChange: coinsChange,
      favorability: favorability,
      favorabilityChange: favorabilityChange
    };

    fs.writeFileSync(dataPath, yaml.stringify(userData));

    return this.reply(`今天的人品是：${luck}
你获得了${coinsChange}个喵喵币和${favorabilityChange}点好感度
当前好感度：${favorability}
当前喵喵币：${userData[userId].coins}
${rp}`, false, { at: true });
    }

  async info(e) {
    const userId = `${e.user_id}`;

    let userData = {};
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      userData = yaml.parse(fileContent) || {};
    }

    const { favorability = 0, coins = 0 } = userData[userId] || {};

    return this.reply(`好感度：${favorability}
喵喵币：${coins}`, false, { at: true });
  }
}
