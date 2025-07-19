import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';

function isIPv6(address) {
    const ipv6Regex = /^(?:([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|((?:[0-9a-fA-F]{1,4}:){1,7}:)|((?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|((?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2})|((?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3})|((?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4})|((?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6})|(::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}))$/;
    return ipv6Regex.test(address);
}

// 处理域名，提取 SRV 前部分
function extractDomainForDisplay(domain) {
    // 例如 _minecraft._tcp.example.com 取 example.com
    // 只要不是 IP，就尝试去除开头的 _xxx._xxx. 部分
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return domain; // IPv4
    if (isIPv6(domain)) return domain;

    const parts = domain.split('.');
    // 如果开头是 _开头的子域，则去掉这两个部分
    if (parts.length > 2 && parts[0].startsWith('_') && parts[1].startsWith('_')) {
        return parts.slice(2).join('.');
    }
    return domain;
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
        const inputRaw = e.msg.match(/^#ping\s+(.+)$/)?.[1].trim();
        if (!inputRaw) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

        // 只允许字母、数字、点、短横线和中文
        if (!/^[a-zA-Z0-9.\-\u4e00-\u9fa5]+$/.test(inputRaw)) {
            return e.reply('服务器地址格式不正确哦~');
        }

        if (isIPv6(inputRaw)) {
            return e.reply('还不支持 IPv6 地址哦~');
        }

        // 转punycode处理中文域名显示（需要 Node 16+ 环境支持 URL 类）
        let punycodeDomain;
        try {
            punycodeDomain = new URL(`http://${inputRaw}`).hostname;
        } catch {
            // 不是标准域名时，直接用原始
            punycodeDomain = inputRaw;
        }

        // 显示用域名，去除SRV前缀
        const displayDomain = extractDomainForDisplay(punycodeDomain);

        const isWin = process.platform === 'win32';
        const command = isWin ? `ping -n 4 "${inputRaw}"` : `ping -c 4 "${inputRaw}"`;

        exec(command, (err, stdout, stderr) => {
            if (err || stderr) {
                return e.reply(`Ping 失败：${stderr || err.message}`);
            }

            const lines = stdout.trim().split('\n');

            // 获取IP地址（IPv4）
            let ipMatch = lines[0].match(/PING\s.+\s\(([\d.]+)\)/);
            if (!ipMatch && isWin) {
                ipMatch = lines[0].match(/\[([\d.]+)\]/);
            }
            const ip = ipMatch?.[1] || inputRaw;

            // 用于显示的目标格式
            const targetDisplay = /^[\d.]+$/.test(inputRaw) ? ip : `${displayDomain} [${ip}]`;

            // 过滤有效回复行
            const replyLines = lines.filter(line => {
                if (isWin) return line.includes('字节=');
                else return line.includes('bytes from');
            });

            // 提取time和ttl，time为数字或0时显示<1ms
            const timesAndTTL = replyLines.map(line => {
                let timeMatch = line.match(/time=([\d.]+) ?ms/);
                let ttlMatch = line.match(/ttl=(\d+)/i);

                if (!timeMatch && isWin) {
                    timeMatch = line.match(/时间[=<]([\d]+)ms/);
                    ttlMatch = line.match(/TTL=(\d+)/i);
                }

                let timeVal = timeMatch ? parseFloat(timeMatch[1]) : null;
                if (timeVal === 0) timeVal = '<1';

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
                const timeStr = time === '<1' ? '<1ms' : `${Math.round(time)}ms`;
                msg += `来自 ${ip} 的回复: 字节=32 时间=${timeStr} TTL=${ttl}\n`;
            });

            if (received === 0) {
                msg += `请求超时。\n`;
            }

            if (received > 0) {
                // 数字计算时用 1 代替 <1
                const numericTimes = timesAndTTL.map(t => (t.time === '<1' ? 1 : t.time));
                const min = Math.min(...numericTimes);
                const max = Math.max(...numericTimes);
                const avg = Math.round(numericTimes.reduce((a, b) => a + b, 0) / numericTimes.length);

                msg += `\n${ip} 的 Ping 统计信息:\n`;
                msg += `    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${lost} (${lossRate}% 丢失)，\n`;
                msg += `往返行程的估计时间(以毫秒为单位):\n`;
                msg += `    最短 = ${min === 1 ? '<1' : min}ms，最长 = ${max}ms，平均 = ${avg}ms`;
            } else {
                msg += `\n${ip} 的 Ping 统计信息:\n`;
                msg += `    数据包: 已发送 = ${sent}，已接收 = 0，丢失 = 4 (100% 丢失)，`;
            }

            e.reply(msg);
        });
    }
}
