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
        headers: req.headers,
        method: req.method,
        data: req.body ? JSON.stringify(req.body) : null,
    }
    console.log('Request:', axiosConfig);
    delete axiosConfig.headers.host;
    try {
        const response = await axios(axiosConfig);
        console.log('Response:', response.data);
        res.status(response.status).send(response.data);
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            console.log('Error response:', axiosError.response.data);
            res.status(axiosError.response.status).send(axiosError.response.data);
        } else {
            console.log('Error:', axiosError);
            res.status(500).send({
                message: 'Internal Server Error',
                error: axiosError.message
            });
        }
    }

   } else {
    res.status(502).send({message: 'Service not found!'});
   }
});

app.use('/', router);