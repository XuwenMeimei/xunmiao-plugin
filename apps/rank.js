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
        let nickname = data.id || '';
        // 如果没有昵称，或者昵称和QQ号一样，显示 匿名(QQ号)
        if (!nickname || nickname === uid) {
          nickname = `匿名(${uid})`;
        } else {
          nickname = `${nickname}(${uid})`;
        }
        if (type === '喵喵币') {
          // coins + bank
          const coins = Number(data.coins || 0);
          const bank = Number(data.bank || 0);
          return {
            uid,
            value: coins + bank,
            coins,
            bank,
            nickname
          }
        } else {
          return {
            uid,
            value: data[key] || 0,
            nickname
          }
        }
      });

    // 排序，显示所有用户
    userList.sort((a, b) => b.value - a.value);
    const topList = userList; // 不再 slice 取前10

    // 构造渲染数据
    const data = {
      type: label,
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