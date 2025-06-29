import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';
import cfg from '../../../lib/config/config.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

export class duel extends plugin {
    constructor() {
      super({
        name: '寻喵查询',
        dsc: '寻喵查询功能',
        event: 'message',
        priority: 5000,
        rule: [
          {
            reg: '^#查询(.*)$',
            fnc: 'check'
          },
          {
            reg: '^#重置签到(.*)$',
            fnc: 'resetSign'
          },
          {
            reg: '^#重置全部签到$',
            fnc: 'resetAllSign'
          },
          {
            reg: '^#设置体力(.*)$',
            fnc: 'setStamina'
          }
        ]
      })
    }

    async check(e) {
        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能查询哦~', false, { at:true });
        } else {
            const fileContent = fs.readFileSync(dataPath, 'utf8');
            let userData = yaml.parse(fileContent) || {};

            const id = e.at;

            e.reply(`QQ号：${e.at}
上次签到：${userData[id]?.lastSignIn ?? '无'}
今日人品：${userData[id]?.luck ?? '无'}
喵喵币：${userData[id]?.coins ?? 0}
好感度：${userData[id]?.favorability ?? 0}
银行存款：${userData[id]?.bank ?? 0}
累计签到：${userData[id]?.totalSignCount ?? 0}
连续签到：${userData[id]?.continueSignCount ?? 0}`)
        }
    }

    async resetSign(e) {
        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能重置签到哦~', false, { at:true });
        }
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        const id = e.at;
        if (!id || !userData[id]) {
            return e.reply('请@需要重置签到的用户哦~', false, { at:true });
        }

        userData[id].lastSignIn = '';
        userData[id].coinsChange = 0;
        userData[id].favorabilityChange = 0;
        userData[id].luck = 0;
        userData[id].rp = '';

        const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
        if (userData.dailySignOrder && userData.dailySignOrder[today]) {
            userData.dailySignOrder[today] = Math.max(0, userData.dailySignOrder[today] - 1);
        }

        fs.writeFileSync(dataPath, yaml.stringify(userData));

        return e.reply(`已重置${id}的每日签到状态。`, false, { at:true });
    }

    async resetAllSign(e) {
        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能重置所有人的签到哦~', false, { at: true });
        }
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        let count = 0;
        for (const id in userData) {
            if (id === 'dailySignOrder') continue;
            userData[id].lastSignIn = '';
            userData[id].coinsChange = 0;
            userData[id].favorabilityChange = 0;
            userData[id].luck = 0;
            userData[id].rp = '';
            count++;
        }

        const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
        if (userData.dailySignOrder && userData.dailySignOrder[today]) {
            userData.dailySignOrder[today] = 0;
        }

        fs.writeFileSync(dataPath, yaml.stringify(userData));
        return e.reply(`已重置${count}个用户的每日签到状态。`, false, { at: true });
    }

    async setStamina(e) {
        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能设置体力哦~', false, { at: true });
        }
        // 兼容 #设置体力 @对象 数值
        const id = e.at;
        const match = e.msg.match(/#设置体力\s*(\d+)$/);
        let stamina = null;
        if (match) {
            stamina = parseInt(match[1], 10);
        }
        if (!id || typeof stamina !== 'number' || isNaN(stamina)) {
            return e.reply('格式错误，请使用 #设置体力 @对象 数值', false, { at: true });
        }

        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        if (!userData[id]) userData[id] = {};
        userData[id].stamina = stamina;
        userData[id].lastStaminaTime = Date.now();

        fs.writeFileSync(dataPath, yaml.stringify(userData));
        return e.reply(`已将${id}的体力设置为${stamina}。`, false, { at: true });
    }
}