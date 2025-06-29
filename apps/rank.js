import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

const rankTypes = {
  '喵喵币': { key: 'coins', label: '喵喵币' },
  '好感度': { key: 'favorability', label: '好感度' },
  '摸鱼次数': { key: 'catchFishCount', label: '摸鱼次数' }
};

export class rank extends plugin {
  constructor() {
    super({
      name: '排行榜',
      dsc: '排行榜查询',
      event: 'message',
      priority: 5000,
      rule: [
        {
          // 支持 #排行榜  喵喵币 这种中间有空格的写法
          reg: /^#排行榜\s*(喵喵币|好感度|摸鱼次数)?\s*$/,
          fnc: 'showRank'
        }
      ]
    })
  }

  async showRank(e) {
    let type = '喵喵币';
    const match = e.msg.match(/^#排行榜\s*(喵喵币|好感度|摸鱼次数)?\s*$/);
    if (match && match[1]) type = match[1].trim();

    const { key, label } = rankTypes[type] || rankTypes['喵喵币'];
    if (!fs.existsSync(dataPath)) {
      return e.reply('暂无数据~', false, { at: true });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    let userData = yaml.parse(fileContent) || {};

    // 过滤掉非用户数据
    let userList = Object.entries(userData)
      .filter(([uid, data]) => /^\d+$/.test(uid) && typeof data === 'object')
      .map(([uid, data]) => {
        if (type === '喵喵币') {
          // coins + bank
          const coins = Number(data.coins || 0);
          const bank = Number(data.bank || 0);
          return {
            uid,
            value: coins + bank,
            coins,
            bank,
            favorability: Number(data.favorability || 0),
            catchFishCount: Number(data.catchFishCount || 0),
            nickname: data.id || uid
          }
        } else {
          return {
            uid,
            value: data[key] || 0,
            coins: Number(data.coins || 0),
            bank: Number(data.bank || 0),
            favorability: Number(data.favorability || 0),
            catchFishCount: Number(data.catchFishCount || 0),
            nickname: data.id || uid
          }
        }
      });

    // 统计总和
    const totalCoins = userList.reduce((sum, u) => sum + (Number(u.coins) || 0) + (Number(u.bank) || 0), 0);
    const totalFavorability = userList.reduce((sum, u) => sum + (Number(u.favorability) || 0), 0);
    const totalCatchFish = userList.reduce((sum, u) => sum + (Number(u.catchFishCount) || 0), 0);

    // 排序
    userList.sort((a, b) => b.value - a.value);
    const topList = userList; // 显示全部用户

    // 获取昵称（如有 card 字段则用 card，否则用 QQ 号）
    for (let user of topList) {
      if (!user.nickname || user.nickname === user.uid) {
        try {
          const info = await Bot.pickUser(user.uid).getInfo();
          user.nickname = info.card || info.nickname || user.uid;
        } catch {
          user.nickname = user.uid;
        }
      }
    }

    // 构造渲染数据
    let summary = '';
    if (type === '喵喵币') {
      summary = `一共有${totalCoins}个喵喵币`;
    } else if (type === '好感度') {
      summary = `一共有${totalFavorability}点好感度`;
    } else if (type === '摸鱼次数') {
      summary = `一共摸了${totalCatchFish}次鱼`;
    }

    const data = {
      type: label,
      summary: summary,
      list: topList.map((u, idx) => {
        if (type === '喵喵币') {
          return {
            rank: idx + 1,
            nickname: u.nickname,
            value: `${u.coins} + ${u.bank}`
          }
        } else {
          return {
            rank: idx + 1,
            nickname: u.nickname,
            value: u.value
          }
        }
      })
    };

    // 渲染图片
    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: `rank_${key}`,
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/rank/rank.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/rank/rank.css`,
      data: data
    });

    return e.reply(base64, false, { at: true });
  }
}