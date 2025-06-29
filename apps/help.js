import plugin from '../../../lib/plugins/plugin.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");

const helpList = [
  { cmd: '#签到', desc: '每日签到' },
  { cmd: '#我的信息', desc: '查看个人信息' },
  { cmd: '#背包', desc: '查看背包物品' },
  { cmd: '#使用[物品编号] [数量]', desc: '使用背包物品，如 #使用1 或 #使用1 3' },
  { cmd: '#商店', desc: '查看商店商品' },
  { cmd: '#购买[商品编号] [数量]', desc: '购买商店物品，如 #购买1 或 #购买1 2' },
  { cmd: '#存钱 [数量|全部]', desc: '将喵喵币存入银行' },
  { cmd: '#取钱 [数量|全部]', desc: '从银行取出喵喵币' },
  { cmd: '#转账 @对象 [数量]', desc: '向他人转账喵喵币' },
  { cmd: '#决斗 @对象 [数量]', desc: '与他人决斗，赢了可获得喵喵币' },
  { cmd: '#排行榜 [喵喵币|好感度|摸鱼次数]', desc: '查看排行榜' },
  { cmd: '#摸鱼', desc: '消耗体力摸鱼' },
  { cmd: '#寻喵贴贴|抱抱', desc: '贴贴寻喵' },
  { cmd: '#寻喵帮助', desc: '查看本帮助菜单' }
];

export class help extends plugin {
  constructor() {
    super({
      name: '寻喵帮助',
      dsc: '帮助菜单',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#寻喵帮助$',
          fnc: 'help'
        }
      ]
    })
  }

  async help(e) {
    const data = {
      title: '寻喵插件帮助菜单',
      list: helpList
    };
    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'help',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/help/help.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/help/help.css`,
      data,
      deviceScaleFactor: 3
    });
    return e.reply(base64, false, { at: true });
  }
}