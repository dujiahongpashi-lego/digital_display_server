// 网络请求。原生够用，所以没有用EGG内置的HTTPCLIENT
const http = require("http")
const https = require("https")

const get = url => {
    return new Promise((resolve, reject) => {
        const httpProtocol = url.includes("https://") ? https : http
        httpProtocol.get(url, res => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        }).on('error', reject);
    });
};
module.exports = { get }