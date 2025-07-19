import plugin from '../../../lib/plugins/plugin.js';
import ping from 'net-ping';

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

        const target = input;
        const session = ping.createSession({
            timeout: 2000,
            retries: 1
        });

        const results = [];
        let sent = 0;
        let received = 0;

        const ipAddress = await this.resolveIP(target).catch(() => null);
        const ipText = ipAddress || target;

        const fakeTTL = 52; // net-ping 不提供 TTL，我们用固定值模拟

        e.reply(`正在 Ping ${target} [${ipText}] 具有 32 字节的数据:`);

        const doPing = (count) => {
            if (count >= 4) {
                const times = results.map(r => r.time);
                const min = Math.min(...times);
                const max = Math.max(...times);
                const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                const lost = sent - received;
                const lossRate = Math.round((lost / sent) * 100);

                const statMsg = [
                    ``,
                    `${ipText} 的 Ping 统计信息:`,
                    `    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${lost} (${lossRate}% 丢失)，`,
                    `往返行程的估计时间(以毫秒为单位):`,
                    `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`
                ].join('\n');

                e.reply(statMsg);
                session.close();
                return;
            }

            sent++;
            const sendTime = Date.now();
            session.pingHost(target, (error, targetIp, sentTime, rcvdTime) => {
                const duration = Math.round(rcvdTime - sentTime);
                if (!error) {
                    received++;
                    results.push({ time: duration });
                    e.reply(`来自 ${targetIp} 的回复: 字节=32 时间=${duration}ms TTL=${fakeTTL}`);
                } else {
                    results.push({ time: 0 });
                    e.reply(`请求超时。`);
                }

                // 等待 1 秒后发送下一次
                setTimeout(() => doPing(count + 1), 1000);
            });
        };

        doPing(0);
    }

    // DNS解析（返回IP地址）
    async resolveIP(host) {
        const dns = await import('dns/promises');
        const res = await dns.lookup(host);
        return res?.address;
    }
}
