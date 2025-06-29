import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

const _path = process.cwd().replace(/\\/g, "/");
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;
const userDataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const itemsPath = `${_path}/plugins/xunmiao-plugin/config/items.yaml`;

function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
}
function getUserData() {
  if (!fs.existsSync(userDataPath)) fs.writeFileSync(userDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(userDataPath, 'utf8')) || {};
}
function getShopItems() {
  if (!fs.existsSync(itemsPath)) return [];
  const content = fs.readFileSync(itemsPath, 'utf8');
  return yaml.parse(content) || [];
}

export class inv extends plugin {
  constructor() {
    super({
      name: '寻喵背包',
      dsc: '背包系统',
      event: 'message',
      priority: 5000,
      cron: [],
      rule: [
        { reg: '^#*背包$', fnc: 'showInv' },
        { reg: '^#*使用(\\d+)$', fnc: 'useItem' }
      ]
    })
  }

  async showInv(e) {
    const userId = `${e.user_id}`;
    let invData = getInvData();
    const shopItems = getShopItems();

    if (!invData[userId] || Object.keys(invData[userId]).length === 0) {
      return e.reply('你的背包是空的哦~', false, { at: true });
    }

    let msg = '【你的背包】\n';
    for (const item of shopItems) {
      const count = invData[userId][item.id] || 0;
      if (count > 0) {
        msg += `#${item.id} ${item.name} x${count}\n`;
      }
    }
    msg += '\n发送 #使用物品编号 进行使用，如 #使用1';
    return e.reply(msg, false, { at: true });
  }

  async useItem(e) {
    const userId = `${e.user_id}`;
    const match = e.msg.match(/^#*使用(\d+)$/);
    if (!match) return e.reply('格式错误，请发送 #使用物品编号', false, { at: true });

    const itemId = parseInt(match[1]);
    const shopItems = getShopItems();
    const shopItem = shopItems.find(i => i.id === itemId);
    if (!shopItem) return e.reply('没有这个物品编号哦~', false, { at: true });

    let invData = getInvData();
    let userData = getUserData();

    if (!invData[userId] || !invData[userId][itemId] || invData[userId][itemId] <= 0) {
      return e.reply(`你的背包里没有【${shopItem.name}】`, false, { at: true });
    }

    // 物品效果
    let effectMsg = '';
    if (shopItem.use && shopItem.use.type === 'stamina') {
      if (!userData[userId]) userData[userId] = { stamina: 100 };
      const before = userData[userId].stamina || 0;
      userData[userId].stamina = Math.min(100, before + shopItem.use.value);
      effectMsg = `体力恢复${shopItem.use.value}点，当前体力${userData[userId].stamina}/100`;
    } else {
      effectMsg = '该物品暂不可使用或无效果。';
    }

    // 扣除物品
    invData[userId][itemId] -= 1;
    if (invData[userId][itemId] <= 0) delete invData[userId][itemId];

    fs.writeFileSync(invDataPath, yaml.stringify(invData));
    fs.writeFileSync(userDataPath, yaml.stringify(userData));

    return e.reply(`你使用了【${shopItem.name}】\n${effectMsg}`, false, { at: true });
  }
}