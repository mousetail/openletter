export type SiteSettings = Array<
    | ['clientId', string]
    | ['clientSecret', string]
    | ['key', string]
    | ['letterVersion', string]
    | ['redirectUri', string]
>;

export interface ConfigOptions {
    database: DbConnectionOptions;
    port: number;
    secretKey: string;
    siteSettings: SiteSettings;
}

export interface ConnectionOptions {
    host: string;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
}

export class Config {
    database: DbConnectionOptions;
    port: number;
    secretKey: string;
    siteSettings: SiteSettings;

    /**
     * Create a new configuration instance.
     * @param database Connection specifications for your application database.
     * @param port The port on which your application will listen.
     * @param secretKey A secret key for encryption within your application.
     * @param siteSettings An array of key-value site settings.
     */
    constructor({ database, port, secretKey, siteSettings }: ConfigOptions) {
        this.database = database;
        this.port = port;
        this.secretKey = secretKey;
        this.siteSettings = siteSettings;
    }

    /**
     * Retrieve the value of a site setting, as specified in the config file.
     * @param name the name of the site setting to find
     */
    getSiteSetting(name: string): any {
        const matches = this.siteSettings.filter((s) => s[0] === name);
        return matches.length > 0 ? matches[0][1] : null;
    }
}

export class DbConnectionOptions {
    host: string;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;

    /**
     * Create a new database connection options instance.
     * @param host The host on which your database server is running.
     * @param user The username with which to connect to the database.
     * @param password The password corresponding to the specified user.
     * @param database The database to scope the connection to.
     * @param connectionLimit The maximum number of connections to allow in the connection pool.
     */
    constructor({
        host,
        user,
        password,
        database,
        connectionLimit,
    }: ConnectionOptions) {
        this.host = host;
        this.user = user;
        this.password = password;
        this.database = database;
        this.connectionLimit = connectionLimit;
    }

    connectionObject() {
        return {
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
            connectionLimit: this.connectionLimit,
        };
    }
}
