import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import cfg from '../../../lib/config/config.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import axios from 'axios';

const _path = process.cwd().replace(/\\/g, '/');
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_data.yaml`;

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath, yaml.stringify({}));
    return yaml.parse(fs.readFileSync(marryDataPath, 'utf8')) || {};
}

function saveMarryData(data) {
    fs.writeFileSync(marryDataPath, yaml.stringify(data));
}

export class marry extends plugin {
    constructor() {
        super({
            name: '结婚',
            dsc: '结婚娱乐模块',
            event: 'message',
            priority: 5000,
            rule: [
                { reg: '^#结婚$', fnc: 'marry' },
                { reg: '^#?我愿意$', fnc: 'acceptmarry' },
                { reg: '^#?我拒绝$', fnc: 'rejectmarry' },
                { reg: '^#离婚$', fnc: 'divorce' },
                { reg: '^#强娶$', fnc: 'marryadmin' },
                { reg: '^#抱抱$', fnc: 'marryhug'},
                { reg: '^#亲亲$', fnc: 'marrykiss'}
            ]
        });
    }

    normalizeId(id) {
        return id != null ? String(id) : null;
    }

    async marryhug(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');

        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const userId = this.normalizeId(e.user_id);
        
        allMarryData[groupId] = allMarryData[groupId] || {};
        const marryData = allMarryData[groupId];

        if (!marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你还没有结婚哦~ ']);
        }

        const she_he = await this.people(e, 'sex', userId);

        let targetMemberInfo = await Bot.pickGroup(groupId).pickMember(marryData[userId].target).getInfo();
        let targetName = targetMemberInfo?.card || targetMemberInfo?.nickname || she_he;

        return e.reply([segment.at(userId), ' 你抱了抱' + targetName + '，感受到了温暖和幸福~']);

    }

    async marrykiss(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');

        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const userId = this.normalizeId(e.user_id);

        allMarryData[groupId] = allMarryData[groupId] || {};
        const marryData = allMarryData[groupId];

        if (!marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你还没有结婚哦~ ']);
        }

        const she_he = await this.people(e, 'sex', userId);
        
        let targetMemberInfo = await Bot.pickGroup(groupId).pickMember(marryData[userId].target).getInfo();
        let targetName = targetMemberInfo?.card || targetMemberInfo?.nickname || she_he;

        return e.reply([segment.at(userId), ' 你亲吻了' + targetName + '，感受到了甜蜜和幸福~']);
    }

    async marryadmin(e) {
        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);

        allMarryData[groupId] = allMarryData[groupId] || {};
        const marryData = allMarryData[groupId];

        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能使用哦~', false, { at: true });
        }

        if (!e.isGroup) {
            return e.reply('这个功能仅支持群聊使用哦~');
        }

        marryData[userId] = { wait: false, married: true, target: atUserId };
        marryData[atUserId] = { wait: false, married: true, target: userId };
        saveMarryData(allMarryData);

        return e.reply([
            segment.at(userId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`), "\n",
            segment.at(atUserId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${atUserId}`), "\n",
            `主人强行将你结婚了哦~`, "\n",
            '相亲相爱幸福永，同德同心幸福长。愿你俩情比海深！祝福你们新婚愉快，幸福美满，激情永在，白头偕老！'
        ]);
    }

    async marry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        
        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        allMarryData[groupId] = allMarryData[groupId] || {};
        const marryData = allMarryData[groupId];

        let userInfo = await Bot.pickGroup(groupId).pickMember(userId).getInfo();
        let userName = userInfo?.card || userInfo?.nickname;

        let atUserInfo = await Bot.pickGroup(groupId).pickMember(atUserId).getInfo();
        let atUserName = atUserInfo?.card || atUserInfo?.nickname;


        if (message.some(item => item.qq === 'all')) {
            return e.reply([segment.at(userId), ' 不可以这样！']);
        }

        if (message.filter(item => item.type === 'at').length > 1) {
            return e.reply([segment.at(userId), ' 不能同时和两个人结婚哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 啊嘞?这...这样不行啦~(害羞) ']);
        }

        if (!atUserId) {
            return e.reply([segment.at(userId), ' 请@你想要结婚的人哦~ ']);
        }

        if (userId === atUserId) {
            return e.reply([segment.at(userId), ' 嗯?你不能和自己结婚哦~ ']);
        }

        if (marryData[userId].target == atUserId) {
            return e.reply([segment.at(userId), ' 你已经和', atUserName, '结婚了哦~'])
        }

        if (marryData[userId]?.married) {
            return e.reply([segment.at(userId), ' 唔...你在想什么呢!你已经结婚了哦~ ']);
        }

        if (marryData[atUserId]?.married) {
            return e.reply([segment.at(userId), ' 唔...对方已经结婚了哦~ ']);
        }

        const she_he = await this.people(e, 'sex', userId);

        marryData[userId] = { wait: true, married: false, target: atUserId };
        marryData[atUserId] = { wait: true, married: false, target: userId };
        saveMarryData(allMarryData);

        let userImgUrl = Bot.pickUser(userId).getAvatarUrl();
        let userImg = '';
        let atUserImgUrl = Bot.pickUser(atUserId).getAvatarUrl();
        let atUserImg = '';

        try {
            userImg = await getBase64FromUrl(userImgUrl);
            atUserImg = await getBase64FromUrl(atUserImgUrl);
        } catch(e) {
            console.error('头像获取失败', e);
        }

        const data = {
            userName,
            atUserName,
            userImg,
            atUserImg,
            she_he
        }

        const base64 = await puppeteer.screenshot('xunmiao-plugin', {
            saveId: 'marry',
            imgType: 'png',
            tplFile: `${_path}/plugins/xunmiao-plugin/res/marry/marry.html`,
            pluginResources: `${_path}/plugins/xunmiao-plugin/res/marry/marry.css`,
            data: data
        });

        return await e.reply([
            segment.at(atUserId),
            base64
        ]);
    }

    async acceptmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');

        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const marryData = allMarryData[groupId] || {};
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (!atUserId) return e.reply([segment.at(userId), ' 请@你想要同意的人哦~ ']);
        if (userId === atUserId) return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);

        if (!marryData[userId]?.wait || !marryData[atUserId]?.wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ 或者对方没有向你求婚哦~ ']);
        }

        if (marryData[userId].married || marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 你或对方已经结婚了哦~ ']);
        }

        if (marryData[userId].target === atUserId && marryData[atUserId].target === userId) {
            marryData[userId].wait = false;
            marryData[atUserId].wait = false;
            marryData[userId].married = true;
            marryData[atUserId].married = true;
            saveMarryData(allMarryData);

            return e.reply([
                segment.at(userId), "\n",
                '相亲相爱幸福永，同德同心幸福长。愿你俩情比海深！祝福你们新婚愉快，幸福美满，激情永在，白头偕老！'
            ]);
        }
    }

    async rejectmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const marryData = allMarryData[groupId] || {};
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (!atUserId) return e.reply([segment.at(userId), ' 请@你想要拒绝的人哦~ ']);
        if (userId === atUserId) return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);

        if (!marryData[userId]?.wait || !marryData[atUserId]?.wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ 或者对方没有向你求婚哦~ ']);
        }

        if (marryData[userId].married || marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 你或对方已经结婚了哦~ ']);
        }

        if (marryData[userId].target === atUserId && marryData[atUserId].target === userId) {
            marryData[userId] = { wait: false, married: false, target: null };
            marryData[atUserId] = { wait: false, married: false, target: null };
            saveMarryData(allMarryData);

            return e.reply([
                segment.at(userId), "\n",
                '你拒绝了对方的求婚，希望你们都能找到属于自己的幸福！'
            ]);
        }
    }

    async divorce(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const allMarryData = getMarryData();
        const groupId = String(e.group_id);
        const marryData = allMarryData[groupId] || {};
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        if (!atUserId) return e.reply([segment.at(userId), ' 请@你想要离婚的人哦~ ']);
        if (userId === atUserId) return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);

        if (!marryData[userId]?.married || !marryData[atUserId]?.married) {
            return e.reply([segment.at(userId), ' 你或对方还没有结婚哦~ ']);
        }

        if (marryData[userId].target !== atUserId || marryData[atUserId].target !== userId) {
            return e.reply([segment.at(userId), ' 你们并没有结婚哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        marryData[userId] = { wait: false, married: false, target: null };
        marryData[atUserId] = { wait: false, married: false, target: null };
        saveMarryData(allMarryData);

        return e.reply([
            segment.at(userId), "\n",
            '你们离婚了，希望你们都能找到属于自己的幸福！'
        ]);
    }

    async people(e, keys, id) {
        let memberMap = await e.group.getMemberMap();
        let arrMember = Array.from(memberMap.values());
        let lp = arrMember.find(item => String(item.user_id) === String(id));

        if (!lp) return null;

        if (keys === 'sex') {
            return lp.sex === 'male' ? '他' : '她';
        }

        if (keys === 'nickname') {
            return lp.card !== '' ? lp.card : lp.nickname;
        }
    }
}

async function getBase64FromUrl(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  const mime = response.headers['content-type'] || 'image/png';
  return `data:${mime};base64,${base64}`;
}