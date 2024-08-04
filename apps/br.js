import plugin from '../../../lib/plugins/plugin.js'

let game = 0
let ready = 0

export class br extends plugin {
    constructor() {
        super({
            name: '恶魔轮盘赌',
            dsc: '寻喵恶魔轮盘赌功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#加入游戏|拒绝游戏$|(.*)#恶魔轮盘赌(.*)$', 
                    fnc: 'br'
                }
            ]
        })
    }
    
    async br(e) {
        if (e.isGroup) {
            const message = e.message;
            console.log(message);
            if (e.msg.includes('#恶魔轮盘赌') & e.isMaster & game == 0 & message.some(item => item.qq === '2582312528')) {
                e.reply('你不能与我进行恶魔轮盘赌哦~', false, { at: true });
                return;
            }
            if (e.msg.includes('#恶魔轮盘赌') & e.isMaster & game == 0){
                const player1 = e.user_id;
                const player2 = e.at;
                e.reply([segment.at(player2), ' 有人邀请你游玩恶魔轮盘赌哦~\n发送"加入游戏"加入\n发送“拒绝游戏”拒绝\n邀请有效时间30秒哦~']);
                game = 1;
                time = setTimeout(function (){
                    if (game = 1) {
                        e.reply([segment.at(player1), ' QAQ...他好像没有理你哦~']);
                        game = 0;
                    }
                }, 30000)
           }
           if (e.msg == "加入游戏" & game == 1 & ready == 0 & e.user_id == player2) {
                e.reply([segment.at(player1), segment.at(player2), ' 要开始了哦~']);
                ready = 1;
                clearTimeout(time);
           }
           if (e.msg == "拒绝游戏" & game == 1 & ready == 0 & e.user_id == player2) {
            e.reply([segment.at(player1), ' 对方拒绝了你哦~']);
            game = 0;
            ready = 0;
            clearTimeout(time);
            }
           if (e.msg == "#恶魔轮盘赌" & game == 1) {
            e.reply('已经有人在玩恶魔轮盘赌了哦~', false, { at:true });
            return;
            }
        }else{
            e.reply('你只能在群里进行恶魔轮盘赌哦~');
        }
    }
}