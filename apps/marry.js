import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import cfg from '../../../lib/config/config.js';

const _path = process.cwd().replace(/\\/g, '/');
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_data.yaml`;

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath, yaml.stringify({}));
    return yaml.parse(fs.readFileSync(marryDataPath, 'utf8')) || {};
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
                { reg: '^#强娶$', fnc: 'marryadmin' }
            ]
        });
    }

    normalizeId(id) {
        return id != null ? String(id) : null;
    }

    async marryadmin(e) {
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);

        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能使用哦~', false, { at: true });
        }

        if (!e.isGroup) {
            return e.reply('这个功能仅支持群聊使用哦~');
        }

        const marryData = getMarryData();

        marryData[userId] = { wait: false, married: true, target: atUserId };
        marryData[atUserId] = { wait: false, married: true, target: userId };
        fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

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

        const marryData = getMarryData();
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

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
            return e.reply([segment.at(userId), ' 你不能和自己结婚哦~ ']);
        }

        if (marryData[userId]?.married) {
            return e.reply([segment.at(userId), ' 你已经结婚了哦~ ']);
        }

        if (marryData[atUserId]?.married) {
            return e.reply([segment.at(userId), ' 对方已经结婚了哦~ ']);
        }

        const she_he = await this.people(e, 'sex', userId);

        marryData[userId] = { wait: true, married: false, target: atUserId };
        marryData[atUserId] = { wait: true, married: false, target: userId };
        fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

        let atUserInfo = await Bot.pickFriend(atUserId).getInfo();
        let atUserName = atUserInfo?.nickname || "这位用户";

        return e.reply([
            segment.at(atUserId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${atUserId}`), "\n",
            segment.at(userId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`), "\n",
            `向你求婚：‘亲爱的${atUserName}您好！`, "\n",
            `在茫茫人海中，能够与${atUserName}相遇相知相恋，我深感幸福，守护你是我今生的选择，我想有个自己的家，一个有你的家,嫁给我好吗？`, "\n",
            segment.at(atUserId), "\n",
            `那么${atUserName}，你愿意嫁给${she_he}吗？at并发送【我愿意】或者【我拒绝】，回应${she_he}哦！`
        ]);
    }

    async acceptmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        if (!atUserId) return e.reply([segment.at(userId), ' 请@你想要同意的人哦~ ']);
        if (userId === atUserId) return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);

        if (!marryData[userId]?.wait || !marryData[atUserId]?.wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ 或者对方没有向你求婚哦~ ']);
        }

        if (marryData[userId].married || marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 你或对方已经结婚了哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (marryData[userId].target === atUserId && marryData[atUserId].target === userId) {
            marryData[userId].wait = false;
            marryData[atUserId].wait = false;
            marryData[userId].married = true;
            marryData[atUserId].married = true;
            fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

            return e.reply([
                segment.at(userId), "\n",
                '相亲相爱幸福永，同德同心幸福长。愿你俩情比海深！祝福你们新婚愉快，幸福美满，激情永在，白头偕老！'
            ]);
        }
    }

    async rejectmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = this.normalizeId(e.user_id);
        const atUserId = this.normalizeId(e.at);
        const message = e.message;

        if (!atUserId) return e.reply([segment.at(userId), ' 请@你想要拒绝的人哦~ ']);
        if (userId === atUserId) return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);

        if (!marryData[userId]?.wait || !marryData[atUserId]?.wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ 或者对方没有向你求婚哦~ ']);
        }

        if (marryData[userId].married || marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 你或对方已经结婚了哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (marryData[userId].target === atUserId && marryData[atUserId].target === userId) {
            marryData[userId] = { wait: false, married: false, target: null };
            marryData[atUserId] = { wait: false, married: false, target: null };
            fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

            return e.reply([
                segment.at(userId), "\n",
                '你拒绝了对方的求婚，希望你们都能找到属于自己的幸福！'
            ]);
        }
    }

    async divorce(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
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
        fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

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
