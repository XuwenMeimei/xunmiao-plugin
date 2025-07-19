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
            priority: 0,
            rule: [
                {
                    reg: '^#ping\\s+(.+)$',
                    fnc: 'ping'
                }
            ]
        });
    }

    async ping(e) {
    const input = e.msg.match(/^#ping\s+(.+)$/)?.[1].trim();
    if (!input) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

    // 允许中文、字母、数字、点、短横线，防止注入或非法字符
    // 中文范围：\u4e00-\u9fa5，支持简单中文域名
    if (!/^[a-zA-Z0-9.\-\u4e00-\u9fa5]+$/.test(input)) {
        return e.reply('服务器地址格式不正确哦~');
    }

    if (isIPv6(input)) {
        return e.reply('还不支持 IPv6 地址哦~');
    }

    // 转换中文域名为 ASCII（punycode）
    let asciiInput;
    try {
        asciiInput = new URL('http://' + input).hostname;
    } catch {
        return e.reply('服务器地址格式不正确，无法解析域名');
    }

    const isWin = process.platform === 'win32';
    const command = isWin ? `ping -n 4 "${asciiInput}"` : `ping -c 4 "${asciiInput}"`;

    exec(command, (err, stdout, stderr) => {
        if (err || stderr) {
            return e.reply(`Ping 失败：${stderr || err.message}`);
        }

        const lines = stdout.trim().split('\n');

        // 匹配 IP 地址
        let ipMatch = lines[0].match(/PING\s.+\s\(([\d.]+)\)/);
        if (!ipMatch && isWin) {
            ipMatch = lines[0].match(/\[([\d.]+)\]/);
        }
        const ip = ipMatch?.[1] || asciiInput;

        // 判断输入是否是纯 IPv4 地址
        const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(input);

        // 显示用户输入的域名（中文域名）而非 punycode，IP地址依然显示IP
        const targetDisplay = isIPv4 ? ip : input;

        // 过滤回复行
        const replyLines = lines.filter(line => {
            if (isWin) return line.includes('字节=');
            else return line.includes('bytes from');
        });

        const timesAndTTL = replyLines.map(line => {
            let timeMatch = line.match(/time=([\d.]+) ?ms/);
            let ttlMatch = line.match(/ttl=(\d+)/i);
            if (!timeMatch && isWin) {
                timeMatch = line.match(/时间[=<]([\d]+)ms/);
                ttlMatch = line.match(/TTL=(\d+)/i);
            }

            let timeVal = null;
            if (timeMatch) {
                const t = parseFloat(timeMatch[1]);
                if (isWin && t < 1) {
                    timeVal = '<1';
                } else {
                    timeVal = Math.round(t);
                }
            }

            return {
                time: timeVal,
                ttl: ttlMatch ? parseInt(ttlMatch[1]) : null
            };
        }).filter(item => item.time !== null && item.ttl !== null);

        const sent = 4;
        const received = timesAndTTL.length;
        const lost = sent - received;
        const lossRate = Math.round((lost / sent) * 100);

        let msg = `正在 Ping ${targetDisplay} 具有 32 字节的数据:\n`;

        timesAndTTL.forEach(({ time, ttl }) => {
            const timeStr = (typeof time === 'string' && time === '<1') ? '<1ms' : `${time}ms`;
            msg += `来自 ${ip} 的回复: 字节=32 时间=${timeStr} TTL=${ttl}\n`;
        });

        if (received === 0) {
            msg += `请求超时。\n`;
        }

        if (received > 0) {
            const numericTimes = timesAndTTL
                .map(t => (typeof t.time === 'string' && t.time === '<1') ? 1 : t.time);
            const min = Math.min(...numericTimes);
            const max = Math.max(...numericTimes);
            const avg = Math.round(numericTimes.reduce((a, b) => a + b, 0) / numericTimes.length);

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
