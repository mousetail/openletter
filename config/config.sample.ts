import { Config, DbConnectionOptions } from './configuration';

const database = new DbConnectionOptions({ host: '', user: '', password: '', database: '', connectionLimit: 10 });
const config = new Config({
    database,
    port: 13131,
    secretKey: '',
    siteSettings: [

    ]
});
export default config;
