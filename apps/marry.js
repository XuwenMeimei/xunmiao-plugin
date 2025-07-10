import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, '/');
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_data.yaml`;

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath,yaml.stringify({}));
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
            {
            reg: '^#结婚$',
            fnc: 'marry'
            },
            {
            reg: '^#?我愿意$',
            fnc: 'acceptmarry'
            },
            {
            reg: '^#?我拒绝$',
            fnc: 'rejectmarry'
            },
            {
            reg: '^#离婚$',
            fnc: 'divorce'
            }
            ]
        })
    }

    async marry(e) {
        if (!e.isGroup) {
            return e.reply('这个功能仅支持群聊使用哦~');
        }
        const marryData = getMarryData();
        const userId = e.user_id;
        const atUserId = e.at;
        let message = e.message;

        console.log(e.msg);
        console.log(message);
        console.log(userId);
        console.log(atUserId);

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

        if (userId == atUserId) {
            return e.reply([segment.at(userId), ' 你不能和自己结婚哦~ ']);
        }

        if (marryData[userId] && marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你已经结婚了哦~ ']);
        }

        if (marryData[atUserId] && marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 对方已经结婚了哦~ ']);
        }

        let she_he = await this.people(e, 'sex', userId);

        if (!marryData[userId] || !marryData[userId].married) {

            marryData[userId] = {
                wait: true,
                married: false,
                target: String(atUserId),
            };
            marryData[atUserId] = {
                wait: true,
                married: false,
                target: String(userId),
            };
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
            `那么${atUserName}，你愿意嫁给ta吗？at并发送【我愿意】或者【我拒绝】，回应${she_he}哦！`]);
        }else{
            return;
        }
    }

    async acceptmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = e.user_id;
        const atUserId = e.at;
        let message = e.message;

        if (!atUserId) {
            return e.reply([segment.at(userId), ' 请@你想要同意的人哦~ ']);
        }

        if (userId == atUserId) {
            return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);
        }

        if (!marryData[userId] || !marryData[userId].wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ ']);
        }

        if (!marryData[atUserId] || !marryData[atUserId].wait) {
            return e.reply([segment.at(userId), ' 你@的人没有向你求婚哦~ ']);
        }

        if (marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你已经结婚了，还来捣乱干什么? ']);
        }

        if (marryData[atUserId].married) {
            if (marryData[userId].target !== atUserId || marryData[atUserId].target !== userId) {
                return e.reply([segment.at(userId), ' 对方已经结婚了，你还来捣乱干什么? ']);
            }else{
                return e.reply([segment.at(userId), ' 你们已经结婚了，还来捣乱干什么? ']);
            }
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (marryData[userId].wait || marryData[atUserId].wait) {
            if (marryData[userId].target == atUserId && marryData[atUserId].target == userId) {
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
    }

    async rejectmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = e.user_id;
        const atUserId = e.at;
        let message = e.message;

        if (!atUserId) {
            return e.reply([segment.at(userId), ' 请@你想要拒绝的人哦~ ']);
        }

        if (userId == atUserId) {
            return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);
        }

        if (!marryData[userId] || !marryData[userId].wait) {
            return e.reply([segment.at(userId), ' 没有人向你求婚哦~ ']);
        }

        if (!marryData[atUserId] || !marryData[atUserId].wait) {
            return e.reply([segment.at(userId), ' 你@的人没有向你求婚哦~ ']);
        }

        if (marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你已经结婚了，还来捣乱干什么? ']);
        }

        if (marryData[atUserId].married) {
            if (marryData[userId].target !== atUserId || marryData[atUserId].target !== userId) {
                return e.reply([segment.at(userId), ' 对方已经结婚了，你还来捣乱干什么? ']);
            }else{
                return e.reply([segment.at(userId), ' 你们已经结婚了，还来捣乱干什么? ']);
            }
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (marryData[userId].wait || marryData[atUserId].wait) {
            if (marryData[userId].target == atUserId && marryData[atUserId].target == userId) {
                marryData[userId].wait = false;
                marryData[atUserId].wait = false;
                marryData[userId].target = null;
                marryData[atUserId].target = null;
                fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

                return e.reply([
                    segment.at(userId), "\n",
                    '你拒绝了对方的求婚，希望你们都能找到属于自己的幸福！'
                ]);
            }
        }
    }

    async divorce(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = e.user_id;
        const atUserId = e.at;
        let message = e.message;

        if (!atUserId) {
            return e.reply([segment.at(userId), ' 请@你想要离婚的人哦~ ']);
        }

        if (userId == atUserId) {
            return e.reply([segment.at(userId), ' 你@自己干嘛呀? ']);
        }

        if (!marryData[userId] || !marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你还没有结婚哦~ ']);
        }

        if (!marryData[atUserId] || !marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 你@的人没有结婚哦~ ']);
        }

        if (marryData[userId].target !== atUserId || marryData[atUserId].target !== userId) {
            return e.reply([segment.at(userId), ' 你们并没有结婚哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 你在想什么呀! ']);
        }

        if (marryData[userId].married && marryData[atUserId].married) {
            marryData[userId].wait = false; 
            marryData[atUserId].wait = false;
            marryData[userId].married = false;
            marryData[atUserId].married = false;
            marryData[userId].target = null;
            marryData[atUserId].target = null;
            fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

            return e.reply([
                segment.at(userId), "\n",
                '你们离婚了，希望你们都能找到属于自己的幸福！'
            ]);
        }
    }

    async people(e, keys, id) {
        let memberMap = await e.group.getMemberMap();
        let arrMember = Array.from(memberMap.values());
        var this_one = arrMember.filter(item => {
            return item.user_id == id
        })
        var lp = this_one[0]
        if (keys == 'sex') {
            var she_he = '她'
            if (lp.sex == 'male')
                she_he = '他'
            return she_he
        }
        if (keys == 'nickname') {
            var name = lp.nickname
            if (lp.card !== '')
                name = lp.card
            return name
        }
    }
}