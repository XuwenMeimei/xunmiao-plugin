import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';

export class tools extends plugin {
    constructor() {
        super({
            name: '寻喵工具',
            dsc: '寻喵工具功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#ping(.*)$',
                    fnc: 'ping'
                }
            ]
        });
    }

    async ping(e) {
        const input = e.msg.match(/^#ping\s*(.*)$/)?.[1].trim();
        if (!input) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

        const command = `ping -c 4 ${input}`;

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                return e.reply(`无法 ping 通 ${input}。\n错误信息：${stderr || error.message}`);
            }

            // 提取 IP 地址
            const ipMatch = stdout.match(/PING\s[^(]+\(([\d.]+)\)/);
            const ip = ipMatch ? ipMatch[1] : input;

            // 提取每条回应
            const replyLines = [];
            const replyRegex = /^(\d+)\s+bytes from [^(]*\(([\d.]+)\): icmp_seq=\d+ ttl=(\d+) time=([\d.]+) ms$/gm;
            let match;
            while ((match = replyRegex.exec(stdout)) !== null) {
                const bytes = match[1];
                const ttl = match[3];
                const time = Math.round(parseFloat(match[4]));
                replyLines.push(`来自 ${ip} 的回复: 字节=${bytes} 时间=${time}ms TTL=${ttl}`);
            }

            // 提取统计信息
            const statMatch = stdout.match(/(\d+) packets transmitted, (\d+) received.*?(\d+)% packet loss/);
            const timeStatsMatch = stdout.match(/rtt.*?=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s*ms/);

            if (!statMatch || !timeStatsMatch) {
                return e.reply(`ping 完成，但无法提取统计信息：\n${stdout}`);
            }

            const sent = statMatch[1];
            const received = statMatch[2];
            const loss = statMatch[3];
            const min = Math.round(parseFloat(timeStatsMatch[1]));
            const avg = Math.round(parseFloat(timeStatsMatch[2]));
            const max = Math.round(parseFloat(timeStatsMatch[3]));

            const result = [
                `正在 Ping ${input} [${ip}] 具有 32 字节的数据:`,
                ...replyLines,
                ``,
                `${ip} 的 Ping 统计信息:`,
                `    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${sent - received} (${loss}% 丢失)，`,
                `往返行程的估计时间(以毫秒为单位):`,
                `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`
            ].join('\n');

            return e.reply(result);
        });
    }
}
