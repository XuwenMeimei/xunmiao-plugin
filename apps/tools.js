import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';

function isIPv6(address) {
    const ipv6Regex = /^(?:([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|((?:[0-9a-fA-F]{1,4}:){1,7}:)|((?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|((?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2})|((?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3})|((?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4})|((?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6})|(::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}))$/;
    return ipv6Regex.test(address);
}

export class tools extends plugin {
    constructor() {
        super({
            name: '寻喵工具',
            dsc: '寻喵工具功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#ping\\s*(.*)$',
                    fnc: 'ping'
                }
            ]
        });
    }

    async ping(e) {
        // 从消息中提取地址参数，去掉 #ping
        const input = e.msg.match(/^#ping\s+(.*)$/)?.[1].trim();
        if (!input) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

        // 校验输入，尝试构造URL，防止非法输入导致崩溃
        let url;
        try {
            url = new URL('https://' + input);
        } catch (err) {
            return e.reply(`无效的地址: ${input}`);
        }

        // 目前不支持ipv6
        if (isIPv6(url.hostname)) {
            return e.reply('还不支持ipv6哦~');
        }

        const target = url.hostname;
        const command = `ping -c 4 ${target}`;

        exec(command, (err, stdout, stderr) => {
            if (err || stderr) {
                return e.reply(`Ping 失败：${stderr || err.message}`);
            }

            const lines = stdout.trim().split('\n');
            const ipMatch = lines[0].match(/PING\s.+\s\(([\d.]+)\)/);
            const ip = ipMatch?.[1] || target;

            const replyLines = lines.filter(line => line.includes('bytes from'));

            const timesAndTTL = replyLines.map(line => {
                const timeMatch = line.match(/time=([\d.]+)/);
                const ttlMatch = line.match(/ttl=(\d+)/i);
                return {
                    time: timeMatch ? Math.round(parseFloat(timeMatch[1])) : null,
                    ttl: ttlMatch ? parseInt(ttlMatch[1]) : null
                };
            }).filter(item => item.time !== null && item.ttl !== null);

            const sent = 4;
            const received = timesAndTTL.length;
            const lost = sent - received;
            const lossRate = Math.round((lost / sent) * 100);

            let msg = `正在 Ping ${target} 具有 32 字节的数据:\n`;

            timesAndTTL.forEach(({ time, ttl }) => {
                msg += `来自 ${ip} 的回复: 字节=32 时间=${time}ms TTL=${ttl}\n`;
            });

            if (received === 0) {
                msg += `请求超时。\n`;
            }

            if (received > 0) {
                const times = timesAndTTL.map(t => t.time);
                const min = Math.min(...times);
                const max = Math.max(...times);
                const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

                msg += `\n${ip} 的 Ping 统计信息:\n`;
                msg += `    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${lost} (${lossRate}% 丢失)，\n`;
                msg += `往返行程的估计时间(以毫秒为单位):\n`;
                msg += `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`;
            } else {
                msg += `\n${ip} 的 Ping 统计信息:\n`;
                msg += `    数据包: 已发送 = ${sent}，已接收 = 0，丢失 = 4 (100% 丢失)，`;
            }

            e.reply(msg);
        });
    }
}
