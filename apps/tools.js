import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';
import punycode from 'punycode';

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

        // 仅允许字母、数字、点、短横线，防止注入或非法字符（允许中文域名，后面转换）
        if (!/^[a-zA-Z0-9.\-\u4e00-\u9fa5]+$/.test(input)) {
            return e.reply('服务器地址格式不正确哦~');
        }

        if (isIPv6(input)) {
            return e.reply('还不支持 IPv6 地址哦~');
        }

        // 转换域名为 punycode，保留原输入用于检测是否纯IP
        let asciiInput;
        try {
            asciiInput = punycode.toASCII(input);
        } catch {
            return e.reply('域名转换失败，请检查输入');
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

            // 判断输入是否为 IPv4
            const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(input);

            // 构造显示的目标字符串，纯 IPv4 显示IP，否则显示 punycode [IP]
            const targetDisplay = isIPv4 ? ip : `${asciiInput} [${ip}]`;

            // 过滤出有效的响应行
            const replyLines = lines.filter(line => {
                if (isWin) return line.includes('字节=');
                else return line.includes('bytes from');
            });

            const timesAndTTL = replyLines.map(line => {
                // Linux/macOS
                let timeMatch = line.match(/time=([\d.]+) ?ms/);
                let ttlMatch = line.match(/ttl=(\d+)/i);

                // Windows
                if ((!timeMatch || !ttlMatch) && isWin) {
                    timeMatch = line.match(/时间([=<])([\d]+)ms/);
                    ttlMatch = line.match(/TTL=(\d+)/i);
                    if (timeMatch && ttlMatch) {
                        // Windows 0ms 可能为 <1ms，但正则只捕获数字，单独判断显示
                        const symbol = timeMatch[1]; // = 或 <
                        const val = parseInt(timeMatch[2]);
                        const timeDisplay = symbol === '<' ? '<1' : val;
                        return {
                            time: timeDisplay,
                            ttl: parseInt(ttlMatch[1])
                        };
                    }
                    return null;
                }

                if (!timeMatch || !ttlMatch) return null;

                // Linux/macOS 时间四舍五入，0视为 <1ms
                let timeVal = parseFloat(timeMatch[1]);
                let timeDisplay;
                if (timeVal === 0 || timeVal < 1) {
                    timeDisplay = '<1';
                    timeVal = 1; // 用于平均值计算
                } else {
                    timeDisplay = Math.round(timeVal);
                }


                return {
                    time: timeDisplay,
                    ttl: parseInt(ttlMatch[1])
                };
            }).filter(item => item !== null);

            const sent = 4;
            const received = timesAndTTL.length;
            const lost = sent - received;
            const lossRate = Math.round((lost / sent) * 100);

            let msg = `正在 Ping ${targetDisplay} 具有 32 字节的数据:\n`;

            timesAndTTL.forEach(({ time, ttl }) => {
                const timeStr = time === '<1' ? '<1ms' : `${time}ms`;
                msg += `来自 ${ip} 的回复: 字节=32 时间=${timeStr} TTL=${ttl}\n`;
            });

            if (received === 0) {
                msg += `请求超时。\n`;
            }

            if (received > 0) {
                const numericTimes = timesAndTTL.map(t => (typeof t.time === 'string' && t.time === '<1') ? 1 : t._timeVal || t.time);
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
