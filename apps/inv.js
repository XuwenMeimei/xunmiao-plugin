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

const MAX_STAMINA = 100; // 自然恢复上限
const MAX_STAMINA_OVERFLOW = 300; // 物品使用最大体力上限
const RECOVER_INTERVAL = 60 * 1000; // 每分钟恢复
const RECOVER_AMOUNT = 1;

// 体力自动恢复逻辑（只能恢复到100）
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

export class inv extends plugin {
  constructor() {
    super({
      name: '寻喵背包',
      dsc: '背包系统',
      event: 'message',
      priority: 5000,
      cron: [],
      rule: [
        { reg: '^#背包$', fnc: 'showInv' },
        { reg: '^#使用(\\d+)(?:\\s+(\\d+))?$', fnc: 'useItem' }
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
    msg += '\n发送 #使用物品编号 或 #使用物品编号 数量 进行使用，如 #使用1 或 #使用1 3';
    return e.reply(msg, false, { at: true });
  }

  async useItem(e) {
    const userId = `${e.user_id}`;
    // 支持 #使用1 或 #使用1 3
    const match = e.msg.match(/^#*使用(\d+)(?:\s+(\d+))?$/);
    if (!match) return e.reply('格式错误，请发送 #使用物品编号 或 #使用物品编号 数量', false, { at: true });

    const itemId = parseInt(match[1]);
    let useCount = match[2] ? parseInt(match[2]) : 1;
    if (useCount < 1) useCount = 1;

    const shopItems = getShopItems();
    const shopItem = shopItems.find(i => i.id === itemId);
    if (!shopItem) return e.reply('没有这个物品编号哦~', false, { at: true });

    let invData = getInvData();
    let userData = getUserData();

    if (!invData[userId] || !invData[userId][itemId] || invData[userId][itemId] <= 0) {
      return e.reply(`你的背包里没有【${shopItem.name}】`, false, { at: true });
    }

    // 体力物品前先自动恢复体力（只恢复到100）
    if (!userData[userId]) userData[userId] = { stamina: 100 };
    recoverStamina(userData[userId]);

    let effectMsg = '';
    if (shopItem.use && shopItem.use.type === 'stamina') {
      const before = userData[userId].stamina || 0;
      if (before >= MAX_STAMINA_OVERFLOW) {
        return e.reply('你的体力已经达到最大上限，无法继续使用该物品。', false, { at: true });
      }
      // 计算最多可用数量（最多溢出到300）
      const need = Math.ceil((MAX_STAMINA_OVERFLOW - before) / shopItem.use.value);
      const realUse = Math.min(useCount, invData[userId][itemId], need);
      userData[userId].stamina = Math.min(MAX_STAMINA_OVERFLOW, before + shopItem.use.value * realUse);
      invData[userId][itemId] -= realUse;
      if (invData[userId][itemId] <= 0) delete invData[userId][itemId];
      // 格式：溢出时显示 体力xxx/100，否则xxx/100
      let staminaShow = userData[userId].stamina > MAX_STAMINA
        ? `${userData[userId].stamina}/${MAX_STAMINA}`
        : `${userData[userId].stamina}/${MAX_STAMINA}`;
      effectMsg = `体力恢复${shopItem.use.value * realUse}点，当前体力${staminaShow}`;
      fs.writeFileSync(invDataPath, yaml.stringify(invData));
      fs.writeFileSync(userDataPath, yaml.stringify(userData));
      return e.reply(`你使用了${realUse}个【${shopItem.name}】\n${effectMsg}`, false, { at: true });
    } else {
      // 其他类型物品，默认一次性使用指定数量
      const realUse = Math.min(useCount, invData[userId][itemId]);
      invData[userId][itemId] -= realUse;
      if (invData[userId][itemId] <= 0) delete invData[userId][itemId];
      effectMsg = `你使用了${realUse}个【${shopItem.name}】，但该物品暂不可使用或无效果。`;
      fs.writeFileSync(invDataPath, yaml.stringify(invData));
      fs.writeFileSync(userDataPath, yaml.stringify(userData));
      return e.reply(effectMsg, false, { at: true });
    }
  }
}