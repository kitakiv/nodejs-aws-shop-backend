import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Request, Response  } from 'express';
import axios, { AxiosError } from 'axios';
dotenv.config();

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);

server.listen(process.env.APP_PORT || 8080, () => {
    console.log(`Server is running on port ${process.env.APP_PORT || 8080}`);
});
const router = express.Router();
router.all('/', (req: Request, res: Response) => {
    res.send(JSON.stringify({message: 'Hello World!'}));
});

router.all('/*service', async (req: Request, res: Response) => {
   const service = req.params.service[0];
   const recipientUrl = process.env[service];
   if (process.env[service]) {
    const axiosConfig = {
        url: `${recipientUrl}${req.originalUrl.split('/').slice(2).join('/')}`,
        method: req.method,
        data: req.body ? JSON.stringify(req.body) : null,
        headers: {
            ...req.headers,
            host: undefined,
            'content-length': undefined,
            'transfer-encoding': undefined,
            connection: undefined,
            'sec-fetch-mode': undefined,
            'sec-fetch-site': undefined,
            'sec-fetch-dest': undefined,
            origin: undefined,
            referer: undefined
        }
    }
    console.log('Request:', axiosConfig);
    axios(axiosConfig)
        .then((response) => {
            console.log('Response:', response.data);
            res.status(response.status).send(response.data);
        })
        .catch((error: AxiosError) => {
            if (error.response) {
                console.log('Error:', error.response.data);
                res.status(error.response.status).send(error.response.data);
            } else {
                console.log('Error:', error);
                res.status(500).send(error);
            }
        });

   } else {
    res.status(502).send({message: 'Service not found!'});
   }
});

app.use('/', router);