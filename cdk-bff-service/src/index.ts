import http, { IncomingMessage, ServerResponse } from 'http';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import axios, { AxiosError } from 'axios';

dotenv.config();

const cache = new NodeCache({
    stdTTL: process.env.CACHE_TIME ? Number(process.env.CACHE_TIME) : 120,
    checkperiod: process.env.CACHE_TIME ? Number(process.env.CACHE_TIME) : 120,
});

const CACHE_KEY_PRODUCTS = 'products_list';

const parseBody = (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (e) {
                reject(e);
            }
        });
    });
};

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const { url, method } = req;

    if (!url || !method) return;

    const sendJson = (status: number, data: any) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    if (url === '/' && method === 'GET') {
        sendJson(200, { message: 'Hello!' });
        return;
    }

    if (url === '/product/products' && method === 'GET') {
        const cached = cache.get(CACHE_KEY_PRODUCTS);
        if (cached) {
            sendJson(200, cached);
        } else {
            try {
                const response = await axios.get(`${process.env.product}products`);
                cache.set(CACHE_KEY_PRODUCTS, response.data);
                sendJson(200, response.data);
            } catch (err) {
                const error = err as AxiosError;
                sendJson(error.response?.status || 500, error.response?.data || { message: 'Error fetching products' });
            }
        }
        return;
    }

    if (url?.startsWith('/invalidate-cache') && method === 'POST') {
        cache.del(CACHE_KEY_PRODUCTS);
        sendJson(200, { message: 'Products cache invalidated' });
        return;
    }

    if (url === '/cache-stats' && method === 'GET') {
        sendJson(200, cache.getStats());
        return;
    }

    const serviceMatch = url?.match(/^\/([^\/]+)\/(.*)$/);
    if (serviceMatch) {
        const [, service, restPath] = serviceMatch;
        const recipientUrl = process.env[service];

        if (!recipientUrl) {
            sendJson(502, { message: 'Service not found!' });
            return;
        }

        const data = method === 'GET' || method === 'DELETE' ? null : await parseBody(req);

        try {
            const response = await axios({
                url: `${recipientUrl}/${restPath}`,
                method: method as any,
                data: data || undefined,
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            res.writeHead(response.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response.data));
        } catch (err) {
            const error = err as AxiosError;
            sendJson(error.response?.status || 500, error.response?.data || { message: 'Proxy error' });
        }
        return;
    }

    sendJson(404, { message: 'Not found' });
});

server.listen(process.env.APP_PORT || 8080, () => {
    console.log(`Server is running on port ${process.env.APP_PORT || 8080}`);
});
