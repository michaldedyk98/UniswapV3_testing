import { Client } from "pg"

/** PostgreSQL connection config */
export const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'vault',
}

/** PostgreSQL client */
export const client: Client = new Client(dbConfig)

export async function log(source: string, log: string, input: any, data: any) {
    client.query('INSERT INTO logs(source, log, data, input, timestamp) VALUES ($1, $2, $3, $4, $5)', [
        source,
        log,
        JSON.stringify(data),
        JSON.stringify(input),
        new Date().toISOString()
    ])
}
