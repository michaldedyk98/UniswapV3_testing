import http from 'http';
import express, { Express, request } from 'express';
import morgan from 'morgan';
import routes from './routes/vault';
import { client } from '../scripts/config/db';
import { keyBy } from 'lodash';
import { setContracts } from "../scripts/config/contracts";
import { CronJob } from 'cron';
import internal from './controllers/internal';

/** Express API router */
const router: Express = express()
var txIndex: number = 0

async function main() {
    /** Connect to db */
    await client.connect()

    /** Logging */
    router.use(morgan('dev'));
    /** Parse the request */
    router.use(express.urlencoded({ extended: false }))
    /** Takes care of JSON data */
    router.use(express.json())

    router.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'origin, X-Requested-With,Content-Type,Accept, Authorization')
        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'GET POST')
            return res.status(200).json({})
        }
        next();
    });

    /** Routes */
    router.use('/', routes);

    /** Error handling */
    router.get('/', (req, res, next) => {
        throw new Error('Something went wrong!');
    })

    /** Contract addresses */
    const result = await client.query('SELECT * FROM contracts')
    const resultKeyBy = keyBy(result.rows, 'contract');
    setContracts(resultKeyBy);

    /** Cron jobs */
    var rebalanceJob = new CronJob('0 * * * *', async () => {
        try {
            await internal.rebalance({}, 1);
        }
        catch (err) {
            console.error('[CRON 1H] Failed to rebalance', err)
        }
    }, null, true);
    rebalanceJob.start();

    /** Server */
    const httpServer = http.createServer(router);
    const PORT: any = process.env.PORT ?? 6060;
    httpServer.listen(PORT, () => console.log(`Vault server is running on port: ${PORT}`));
}

//const result = await client.query('SELECT * FROM pair_data WHERE timestamp = $1', [1586995200000])


main()
    .catch((error) => {
        /** End connection to postgres server */
        client.end()

        console.error(error);
        process.exit(1);
    });