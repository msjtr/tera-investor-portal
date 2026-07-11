/**
 * modules/network-monitor.js – كشف VPN / Proxy / Tor / Hosting
 */
(function() {
    async function checkVPNProxy(ip) {
        try {
            const r = await fetch(`https://ip-api.com/json/${ip || ''}?fields=proxy,hosting,query`);
            if (r.ok) {
                const d = await r.json();
                return {
                    ip: d.query,
                    is_vpn: d.proxy || false,
                    is_proxy: d.proxy || false,
                    is_tor: false,
                    is_hosting: d.hosting || false,
                    is_datacenter: d.hosting || false
                };
            }
        } catch (e) {}
        try {
            const r = await fetch(`https://ipapi.co/${ip || ''}/json/`);
            if (r.ok) {
                const d = await r.json();
                return {
                    ip: d.ip,
                    is_vpn: d.proxy || d.hosting || false,
                    is_proxy: d.proxy || false,
                    is_tor: false,
                    is_hosting: d.hosting || false,
                    is_datacenter: d.hosting || false
                };
            }
        } catch (e) {}
        return null;
    }

    window.NetworkMonitor = { checkVPNProxy };
})();
