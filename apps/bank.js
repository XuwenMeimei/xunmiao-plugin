import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;
const receiptTpl = `${_path}/plugins/xunmiao-plugin/res/receipt/bank_receipt.html`;
const receiptCss = `${_path}/plugins/xunmiao-plugin/res/receipt/bank_receipt.css`;

let Savecoins = 0;
let Takecoins = 0;

export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵银行',
      dsc: '寻喵银行功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#(存钱|存入)(.*)$',
          fnc: 'save'
        },
        {
        reg: '^#(取钱|取出)(.*)$',
        fnc: 'take'
        }
      ]
    })
  }
  async save(e) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        if (!userData[e.user_id]) {
            userData[e.user_id] = {
              coins: 0,
              bank: 0
            };
        }

        if (userData[e.user_id].bank === undefined) {
            userData[e.user_id].bank = 0;
        }

        if (userData[e.user_id].coins === undefined) {
            userData[e.user_id].coins = 0;
        }

        // 新增：格式化QQ号，只显示前三位和后两位
        function maskQQ(qq) {
          const qqStr = String(qq);
          if (qqStr.length <= 5) return qqStr;
          return qqStr.slice(0, 3) + '*'.repeat(qqStr.length - 5) + qqStr.slice(-2);
        }
        let nickname = '';
        if (e.sender && e.sender.card) {
          nickname = e.sender.card;
        } else if (e.nickname) {
          nickname = e.nickname;
        } else {
          nickname = '';
        }
        const userShow = nickname
          ? `${maskQQ(e.user_id)}(${nickname})`
          : maskQQ(e.user_id);

        const { coins: coins_id1 } = userData[e.user_id];
        
        // 支持“全部”或数字，兼容“存钱/存入/取钱/取出”，允许无空格
        const regex = /#(存钱|存入)\s*(\d+|全部)?/;
        const match = e.msg.match(regex);

        if (match) {
            if (match[2] === '全部') {
                Savecoins = coins_id1;
            } else if (match[2]) {
                Savecoins = parseInt(match[2], 10);
            } else {
                return e.reply('请输入要存入的喵喵币数量或“全部”~', false, { at: true });
            }
    
            if (Savecoins > coins_id1) {
              return e.reply('你没有那么多喵喵币存入哦~', false, { at: true });
            }

            userData[e.user_id].bank += Savecoins;
            userData[e.user_id].coins -= Savecoins;

            fs.writeFileSync(dataPath, yaml.stringify(userData));

            // 生成账单图片
            const receiptData = {
                type: '存入',
                amount: Savecoins,
                leftCoin: userData[e.user_id].coins,
                leftBank: userData[e.user_id].bank,
                time: new Date().toLocaleString('zh-CN', { hour12: false }),
                user: userShow
            };
            const base64 = await puppeteer.screenshot('xunmiao-plugin', {
                saveId: 'bank_save',
                imgType: 'png',
                tplFile: receiptTpl,
                pluginResources: receiptCss,
                data: receiptData
            });
            return e.reply(base64, false, { at: true });
        }
        fs.writeFileSync(dataPath, yaml.stringify(userData));
    }

    async take(e) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        if (!userData[e.user_id]) {
            userData[e.user_id] = {
              coins: 0,
              bank: 0
            };
        }

        if (userData[e.user_id].bank === undefined) {
            userData[e.user_id].bank = 0;
        }

        if (userData[e.user_id].coins === undefined) {
            userData[e.user_id].coins = 0;
        }

        // 新增：格式化QQ号，只显示前三位和后两位
        function maskQQ(qq) {
          const qqStr = String(qq);
          if (qqStr.length <= 5) return qqStr;
          return qqStr.slice(0, 3) + '*'.repeat(qqStr.length - 5) + qqStr.slice(-2);
        }
        let nickname = '';
        if (e.sender && e.sender.card) {
          nickname = e.sender.card;
        } else if (e.nickname) {
          nickname = e.nickname;
        } else {
          nickname = '';
        }
        const userShow = nickname
          ? `${maskQQ(e.user_id)}(${nickname})`
          : maskQQ(e.user_id);

        const { bank: bank_id1 } = userData[e.user_id];
        
        // 支持“全部”或数字，兼容“存钱/存入/取钱/取出”，允许无空格
        const regex = /#(取钱|取出)\s*(\d+|全部)?/;
        const match = e.msg.match(regex);

        if (match) {
            if (match[2] === '全部') {
                Takecoins = bank_id1;
            } else if (match[2]) {
                Takecoins = parseInt(match[2], 10);
            } else {
                return e.reply('请输入要取出的喵喵币数量或“全部”~', false, { at: true });
            }
    
            if (Takecoins > bank_id1) {
              return e.reply('你没有那么多喵喵币取出哦~', false, { at: true });
            }

            userData[e.user_id].bank -= Takecoins;
            userData[e.user_id].coins += Takecoins;

            fs.writeFileSync(dataPath, yaml.stringify(userData));

            // 生成账单图片
            const receiptData = {
                type: '取出',
                amount: Takecoins,
                leftCoin: userData[e.user_id].coins,
                leftBank: userData[e.user_id].bank,
                time: new Date().toLocaleString('zh-CN', { hour12: false }),
                user: userShow
            };
            const base64 = await puppeteer.screenshot('xunmiao-plugin', {
                saveId: 'bank_take',
                imgType: 'png',
                tplFile: receiptTpl,
                pluginResources: receiptCss,
                data: receiptData
            });
            return e.reply(base64, false, { at: true });
        }
        fs.writeFileSync(dataPath, yaml.stringify(userData));
    }
}