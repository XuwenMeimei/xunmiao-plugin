import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

const _path = process.cwd().replace(/\\/g, "/");
const userDataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;
const itemsPath = `${_path}/plugins/xunmiao-plugin/config/items.yaml`;

// 读取商店物品列表
export function getShopItems() {
  if (!fs.existsSync(itemsPath)) return [];
  const content = fs.readFileSync(itemsPath, 'utf8');
  return yaml.parse(content) || [];
}

export class shop extends plugin {
  constructor() {
    super({
      name: '寻喵商店',
      dsc: '商店系统',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#*商店$', fnc: 'showShop' },
        { reg: '^#*购买(\\d+)$', fnc: 'buyItem' }
      ]
    })
  }

  async showShop(e) {
    const shopItems = getShopItems();
    let msg = '【寻喵商店】\n';
    shopItems.forEach(item => {
      msg += `#${item.id} ${item.name} - ${item.price}喵喵币\n  ${item.desc}\n`;
    });
    msg += '\n发送 #购买商品编号 进行购买，如 #购买1';
    return e.reply(msg, false, { at: true });
  }

  async buyItem(e) {
    const userId = `${e.user_id}`;
    const match = e.msg.match(/^#*购买(\d+)$/);
    if (!match) return e.reply('格式错误，请发送 #购买商品编号', false, { at: true });

    const itemId = parseInt(match[1]);
    const shopItems = getShopItems();
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return e.reply('没有这个商品编号哦~', false, { at: true });

    let userData = getUserData();
    let invData = getInvData();

    if (!userData[userId]) userData[userId] = { coins: 0 };
    if (!invData[userId]) invData[userId] = {};

    if (userData[userId].coins < item.price) {
      return e.reply('你的喵喵币不足，无法购买~', false, { at: true });
    }

    userData[userId].coins -= item.price;
    invData[userId][item.name] = (invData[userId][item.name] || 0) + 1;

    fs.writeFileSync(userDataPath, yaml.stringify(userData));
    fs.writeFileSync(invDataPath, yaml.stringify(invData));

    return e.reply(`你成功购买了1个【${item.name}】，已放入你的背包~`, false, { at: true });
  }
}

// 工具函数
function getUserData() {
  if (!fs.existsSync(userDataPath)) fs.writeFileSync(userDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(userDataPath, 'utf8')) || {};
}
function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
}