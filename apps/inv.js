import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

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

const MAX_STAMINA = 200; // 自然恢复上限
const MAX_STAMINA_OVERFLOW = 999999999; // 物品使用最大体力上限
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
// 分类顺序与分类名
const CATEGORY_ORDER = [
  { key: 'stamina', name: '体力道具' },
  { key: 'glove', name: '手套' },
  { key: 'rod', name: '鱼竿' },
  { key: 'bait', name: '鱼饵' }
];

// 物品分类函数
function getItemCategory(item) {
  return item.category || 'other';
}

// 构建数字ID与英文ID映射
function buildIdMaps(shopItems) {
  const num2id = {};
  const id2num = {};
  let idx = 1;
  for (const item of shopItems) {
    num2id[idx] = item.id;
    id2num[item.id] = idx;
    idx++;
  }
  return { num2id, id2num };
}

// 获取装备状态
function getEquipData(userId, invData) {
  if (!invData[userId] || !invData[userId]._equip) {
    if (!invData[userId]) invData[userId] = {};
    invData[userId]._equip = {};
  }
  return invData[userId]._equip;
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
        { reg: '^#使用(\\d+)(?:\\s+(\\d+))?$', fnc: 'useItem' },
        { reg: '^#装备(\\d+)$', fnc: 'equipItem' },
        { reg: '^#卸下(\\d+)$', fnc: 'unequipItem' }
      ]
    })
  }

  async showInv(e) {
    const userId = `${e.user_id}`;
    let invData = getInvData();
    const shopItems = getShopItems();
    const { num2id, id2num } = buildIdMaps(shopItems);

    if (!invData[userId] || Object.keys(invData[userId]).length === 0) {
      return e.reply('你的背包是空的哦~', false, { at: true });
    }

    // 分类排序并按数字ID升序
    let sorted = [];
    for (const cat of CATEGORY_ORDER) {
      let items = shopItems.filter(i => (i.category || 'other') === cat.key);
      items.sort((a, b) => id2num[a.id] - id2num[b.id]);
      if (items.length > 0) {
        sorted.push({ cat: cat.name, items });
      }
    }
    let otherItems = shopItems.filter(i => !CATEGORY_ORDER.some(c => (i.category || 'other') === c.key));
    otherItems.sort((a, b) => id2num[a.id] - id2num[b.id]);
    if (otherItems.length > 0) {
      sorted.push({ cat: '其他', items: otherItems });
    }

    // 装备信息
    let equipData = getEquipData(userId, invData);
    let equipList = [];
    if (equipData.rod) {
      const rod = shopItems.find(i => i.id == equipData.rod);
      if (rod) equipList.push({ type: '鱼竿', name: rod.name });
    }
    if (equipData.glove) {
      const glove = shopItems.find(i => i.id == equipData.glove);
      if (glove) equipList.push({ type: '手套', name: glove.name });
    }
    if (equipData.bait) {
      const bait = shopItems.find(i => i.id == equipData.bait);
      if (bait) equipList.push({ type: '鱼饵', name: bait.name });
    }

    // 整理背包物品
    let invList = [];
    for (const group of sorted) {
      let groupItems = [];
      for (const item of group.items) {
        const count = invData[userId][item.id] || 0;
        if (count > 0) {
          groupItems.push({
            id: id2num[item.id],
            name: item.name,
            count,
            desc: item.desc
          });
        }
      }
      if (groupItems.length > 0) {
        invList.push({
          cat: group.cat,
          items: groupItems
        });
      }
    }

    // 渲染图片
    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'inv',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/inv/inv.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/inv/inv.css`,
      data: {
        equipList,
        invList,
        tip: '发送 #装备[物品编号] 进行装备，如 #装备3',
        tip1: '发送 #卸下[物品编号] 进行卸下，如 #卸下3',
        tip2: '发送 #使用[物品编号] 或 #使用[物品编号] 数量 进行使用，如 #使用1 或 #使用1 3'
      }
    });

    return e.reply(base64, false, { at: true });
  }

  async equipItem(e) {
    const userId = `${e.user_id}`;
    const shopItems = getShopItems();
    const { num2id } = buildIdMaps(shopItems);
    const match = e.msg.match(/^#*装备(\d+)$/);
    if (!match) return e.reply('格式错误，请发送 #装备[物品编号]', false, { at: true });

    const numId = parseInt(match[1]);
    const itemId = num2id[numId];
    if (!itemId) return e.reply('该物品不可装备或不存在~', false, { at: true });

    let invData = getInvData();
    const shopItem = shopItems.find(i => i.id === itemId);
    if (!shopItem) return e.reply('没有这个物品编号哦~', false, { at: true });

    // 分类判断装备类型
    const type = shopItem.category || 'other';
    if (!['glove', 'rod', 'bait'].includes(type)) {
      return e.reply('该物品不可装备或不存在~', false, { at: true });
    }

    if (!invData[userId] || !invData[userId][itemId] || invData[userId][itemId] <= 0) {
      return e.reply(`你的背包里没有【${shopItem.name}】`, false, { at: true });
    }

    let equipData = getEquipData(userId, invData);

    // 如果是鱼饵，卸下原有鱼饵（同一时间只能装备一种鱼饵）
    if (type === 'bait') {
      delete equipData.bait;
      equipData.bait = itemId;
    } else {
      if (equipData[type]) {
        return e.reply(`你已经装备了${shopItems.find(i => i.id == equipData[type]).name}，请先卸下再装备新的。`, false, { at: true });
      }
      equipData[type] = itemId;
    }

    fs.writeFileSync(invDataPath, yaml.stringify(invData));
    return e.reply(`你已装备【${shopItem.name}】`, false, { at: true });
  }

  async unequipItem(e) {
    const userId = `${e.user_id}`;
    const shopItems = getShopItems();
    const { num2id } = buildIdMaps(shopItems);
    const match = e.msg.match(/^#*卸下(\d+)$/);
    if (!match) return e.reply('格式错误，请发送 #卸下[物品编号]', false, { at: true });

    const numId = parseInt(match[1]);
    const itemId = num2id[numId];
    if (!itemId) return e.reply('该物品不可卸下或不存在~', false, { at: true });

    const shopItem = shopItems.find(i => i.id === itemId);
    if (!shopItem) return e.reply('没有这个物品编号哦~', false, { at: true });

    const type = getItemCategory(shopItem);
    if (!['glove', 'rod', 'bait'].includes(type)) {
      return e.reply('该物品不可卸下或不存在~', false, { at: true });
    }

    let invData = getInvData();
    let equipData = getEquipData(userId, invData);

    if (!equipData[type] || equipData[type] !== itemId) {
      return e.reply(`你没有装备【${shopItem.name}】`, false, { at: true });
    }

    delete equipData[type];
    fs.writeFileSync(invDataPath, yaml.stringify(invData));
    return e.reply(`你已卸下【${shopItem.name}】`, false, { at: true });
  }

  async useItem(e) {
    const userId = `${e.user_id}`;
    const shopItems = getShopItems();
    const { num2id } = buildIdMaps(shopItems);
    // 支持 #使用1 或 #使用1 3
    const match = e.msg.match(/^#*使用(\d+)(?:\s+(\d+))?$/);
    if (!match) return e.reply('格式错误，请发送 #使用[物品编号] 或 #使用[物品编号] 数量', false, { at: true });

    const numId = parseInt(match[1]);
    const itemId = num2id[numId];
    if (!itemId) return e.reply('没有这个物品编号哦~', false, { at: true });

    const shopItem = shopItems.find(i => i.id === itemId);
    if (!shopItem) return e.reply('没有这个物品编号哦~', false, { at: true });

    let useCount = match[2] ? parseInt(match[2]) : 1;
    if (useCount < 1) useCount = 1;

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
      // 计算最多可用数量（最多溢出到500）
      const need = Math.ceil((MAX_STAMINA_OVERFLOW - before) / shopItem.use.value);
      const realUse = Math.min(useCount, invData[userId][itemId], need);
      userData[userId].stamina = Math.min(MAX_STAMINA_OVERFLOW, before + shopItem.use.value * realUse);
      invData[userId][itemId] -= realUse;
      if (invData[userId][itemId] <= 0) delete invData[userId][itemId];
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