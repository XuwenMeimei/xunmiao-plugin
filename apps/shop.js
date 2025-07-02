import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'


const _path = process.cwd().replace(/\\/g, "/");
const userDataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;
const itemsPath = `${_path}/plugins/xunmiao-plugin/config/items.yaml`;

function getShopItems() {
  if (!fs.existsSync(itemsPath)) return [];
  const content = fs.readFileSync(itemsPath, 'utf8');
  return yaml.parse(content) || [];
}
function getUserData() {
  if (!fs.existsSync(userDataPath)) fs.writeFileSync(userDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(userDataPath, 'utf8')) || {};
}
function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
}

// 新增：每日库存数据存储
const stockPath = `${_path}/plugins/xunmiao-plugin/data/shop_stock.yaml`;
function getShopStock() {
  if (!fs.existsSync(stockPath)) fs.writeFileSync(stockPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(stockPath, 'utf8')) || {};
}
function saveShopStock(stock) {
  fs.writeFileSync(stockPath, yaml.stringify(stock));
}

// 新增：每人限购数据存储
const userBuyPath = `${_path}/plugins/xunmiao-plugin/data/user_buy.yaml`;
function getUserBuyData() {
  if (!fs.existsSync(userBuyPath)) fs.writeFileSync(userBuyPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(userBuyPath, 'utf8')) || {};
}
function saveUserBuyData(data) {
  fs.writeFileSync(userBuyPath, yaml.stringify(data));
}

// 新增：每人每日限购数据存储
const userDailyBuyPath = `${_path}/plugins/xunmiao-plugin/data/user_daily_buy.yaml`;
function getUserDailyBuyData() {
  if (!fs.existsSync(userDailyBuyPath)) fs.writeFileSync(userDailyBuyPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(userDailyBuyPath, 'utf8')) || {};
}
function saveUserDailyBuyData(data) {
  fs.writeFileSync(userDailyBuyPath, yaml.stringify(data));
}

const CATEGORY_ORDER = [
  { key: 'stamina', name: '体力道具' },
  { key: 'glove', name: '手套' },
  { key: 'rod', name: '鱼竿' },
  { key: 'bait', name: '鱼饵' }
];

function getItemCategory(item) {
  if (item.use && item.use.type === 'stamina') return 'stamina';
  if (item.id.includes('glove')) return 'glove';
  if (item.id.includes('rod')) return 'rod';
  if (item.id.includes('bait')) return 'bait';
  return 'other';
}

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

export class shop extends plugin {
  constructor() {
    super({
      name: '寻喵商店',
      dsc: '商店系统',
      event: 'message',
      priority: 5000,
      cron: [],
      rule: [
        { reg: '^#商店$', fnc: 'showShop' },
        { reg: '^#购买(\\d+)(?:\\s+(\\d+))?$', fnc: 'buyItem' }
      ]
    })
  }

  async showShop(e) {
    const shopItems = getShopItems();
    if (!shopItems.length) return e.reply('商店暂无商品~', false, { at: true });

    const { num2id, id2num } = buildIdMaps(shopItems);

    // 分类排序
    let sorted = [];
    for (const cat of CATEGORY_ORDER) {
      let items = shopItems.filter(i => getItemCategory(i) === cat.key);
      // 按数字ID升序排序
      items.sort((a, b) => id2num[a.id] - id2num[b.id]);
      if (items.length > 0) {
        sorted.push({ cat: cat.name, items });
      }
    }
    let otherItems = shopItems.filter(i => !CATEGORY_ORDER.some(c => getItemCategory(i) === c.key));
    // 其他分类也排序
    otherItems.sort((a, b) => id2num[a.id] - id2num[b.id]);
    if (otherItems.length > 0) {
      sorted.push({ cat: '其他', items: otherItems });
    }

    // 获取库存
    const nowDate = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    let shopStock = getShopStock();
    if (!shopStock[nowDate]) shopStock[nowDate] = {};

    // 构建渲染用的商品列表
    let list = [];
    for (const group of sorted) {
      for (const item of group.items) {
        let stockStr = '';
        if (item.max_per_day !== undefined && item.max_per_day !== -1) {
          const sold = shopStock[nowDate][item.id] || 0;
          stockStr = `今日剩余${item.max_per_day - sold}`;
        } else {
          stockStr = '无限';
        }
        let limitStr = '';
        if (item.only_once) {
          limitStr = '每人限购1次';
        }
        if (item.max_per_user_per_day !== undefined && item.max_per_user_per_day !== -1) {
          if (limitStr) {
            limitStr += `，每日限购${item.max_per_user_per_day}个`;
          } else {
            limitStr = `每日限购${item.max_per_user_per_day}个`;
          }
        }
        list.push({
          id: id2num[item.id],
          name: item.name,
          price: item.price,
          stock: stockStr,
          limit: limitStr,
          desc: item.desc,
          cat: group.cat
        });
      }
    }

    // 渲染图片
    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'shop',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/shop/shop.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/shop/shop.css`,
      data: {
        list,
        tip: '发送 #购买商品编号 进行购买，如 #购买1 或 #购买1 2'
      }
    });

    return e.reply(base64, false, { at: true });
  }

  async buyItem(e) {
    const userId = `${e.user_id}`;
    const shopItems = getShopItems();
    const { num2id } = buildIdMaps(shopItems);

    const match = e.msg.match(/^#*购买(\d+)(?:\s+(\d+))?$/);
    if (!match) return e.reply('格式错误，请发送 #购买商品编号 或 #购买商品编号 数量', false, { at: true });

    const numId = parseInt(match[1]);
    const itemId = num2id[numId];
    if (!itemId) return e.reply('没有这个商品编号哦~', false, { at: true });

    let buyCount = match[2] ? parseInt(match[2]) : 1;
    if (buyCount < 1) buyCount = 1;

    const item = shopItems.find(i => i.id === itemId);
    if (!item) return e.reply('没有这个商品编号哦~', false, { at: true });

    // 获取库存
    const nowDate = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    let shopStock = getShopStock();
    if (!shopStock[nowDate]) shopStock[nowDate] = {};
    if (!shopStock[nowDate][itemId]) shopStock[nowDate][itemId] = 0;

    // 新增：每人每日限购逻辑
    let userDailyBuyData = getUserDailyBuyData();
    if (!userDailyBuyData[nowDate]) userDailyBuyData[nowDate] = {};
    if (!userDailyBuyData[nowDate][userId]) userDailyBuyData[nowDate][userId] = {};
    const userDailyBought = userDailyBuyData[nowDate][userId][itemId] || 0;
    if (item.max_per_user_per_day !== undefined && item.max_per_user_per_day !== -1) {
      if (userDailyBought + buyCount > item.max_per_user_per_day) {
        return e.reply(`【${item.name}】你今天最多只能买${item.max_per_user_per_day}个，已买${userDailyBought}个，剩余${item.max_per_user_per_day - userDailyBought}个。`, false, { at: true });
      }
    }

    // 新增：每人限购一次逻辑
    let userBuyData = getUserBuyData();
    if (!userBuyData[userId]) userBuyData[userId] = {};
    if (item.only_once && userBuyData[userId][itemId]) {
      return e.reply(`【${item.name}】这个物品只能购买一次，你已经买过了哦~`, false, { at: true });
    }

    // 检查每日限购（-1为无限购买）
    if (item.max_per_day !== undefined && item.max_per_day !== -1) {
      const sold = shopStock[nowDate][itemId];
      if (sold + buyCount > item.max_per_day) {
        return e.reply(`【${item.name}】今天最多只能卖${item.max_per_day}个，已售${sold}个，剩余${item.max_per_day - sold}个。`, false, { at: true });
      }
    }

    // 检查每人限购一次数量
    if (item.only_once && buyCount > 1) {
      return e.reply(`【${item.name}】每人只能购买1个哦~`, false, { at: true });
    }

    let userData = getUserData();
    let invData = getInvData();

    if (!userData[userId]) userData[userId] = { coins: 0, bank: 0 };
    if (userData[userId].bank === undefined) userData[userId].bank = 0;
    if (!invData[userId]) invData[userId] = {};

    const totalPrice = item.price * buyCount;
    let coins = userData[userId].coins || 0;
    let bank = userData[userId].bank || 0;

    if (coins + bank < totalPrice) {
      return e.reply('你的喵喵币和银行存款都不足，无法购买~', false, { at: true });
    }

    let needFromBank = 0;
    if (coins < totalPrice) {
      needFromBank = totalPrice - coins;
      userData[userId].coins = 0;
      userData[userId].bank -= needFromBank;
    } else {
      userData[userId].coins -= totalPrice;
    }
    invData[userId][item.id] = (invData[userId][item.id] || 0) + buyCount;

    // 更新库存
    if (item.max_per_day !== undefined && item.max_per_day !== -1) {
      shopStock[nowDate][itemId] += buyCount;
      saveShopStock(shopStock);
    }

    // 新增：记录每人每日购买数量
    if (item.max_per_user_per_day !== undefined && item.max_per_user_per_day !== -1) {
      userDailyBuyData[nowDate][userId][itemId] = userDailyBought + buyCount;
      saveUserDailyBuyData(userDailyBuyData);
    }

    // 新增：记录每人限购一次
    if (item.only_once) {
      userBuyData[userId][itemId] = true;
      saveUserBuyData(userBuyData);
    }

    fs.writeFileSync(userDataPath, yaml.stringify(userData));
    fs.writeFileSync(invDataPath, yaml.stringify(invData));

    // 生成小票数据
    // 格式化QQ号，只显示前三位和后两位
    function maskQQ(qq) {
      const qqStr = String(qq);
      if (qqStr.length <= 5) return qqStr; // 太短不处理
      return qqStr.slice(0, 3) + '*'.repeat(qqStr.length - 5) + qqStr.slice(-2);
    }
    const maskedQQ = maskQQ(e.user_id);
    let nickname = '';
    if (e.sender && e.sender.card) {
      nickname = e.sender.card;
    } else if (e.nickname) {
      nickname = e.nickname;
    } else {
      nickname = '';
    }
    const userShow = nickname
      ? `${maskedQQ}(${nickname})`
      : maskedQQ;

    const receiptData = {
      user: userShow,
      itemName: item.name,
      itemCount: buyCount,
      itemPrice: item.price,
      totalPrice,
      payCoin: coins < totalPrice ? coins : totalPrice,
      payBank: needFromBank,
      leftCoin: userData[userId].coins,
      leftBank: userData[userId].bank,
      time: new Date().toLocaleString('zh-CN', { hour12: false })
    };

    // 渲染html为图片（假设有 puppeteer.screenshot 方法，和 info/login 一致）
    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'receipt',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/receipt/receipt.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/receipt/receipt.css`,
      data: receiptData
    });

    return e.reply(base64, false, { at: false });
  }
}