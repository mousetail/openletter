import path from 'path';
import sassMiddleware from 'node-sass-middleware';
import layouts from 'ejs-layouts';
import mysql from 'mysql2';
import createDebug from 'debug';
import chalk from 'chalk';

import express, { json, urlencoded } from 'express';

import { ResponseWithLayout } from './definitions';
import { render } from './render_helpers';
import { queries } from './query_helpers';
import { BaseModel } from './models/base';
import config from './config/config';
import { routes } from './config/routes';
import { Signatory } from './models/signatory';

const appLogger = createDebug('app:base');
const routesLogger = createDebug('app:routes');

const pool = mysql.createPool(config.database.connectionObject());
BaseModel.pool = pool;

(async () => {
    const target = await Signatory.where({ se_acct_id: 238697 }).get();
    if (target.length > 0) {
        const mr = target[0];
        mr.update({ is_former_moderator: 1 });
    }
)();

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(layouts.express);

// Libraries setup: body parser (for POST request bodies), cookie parser, SCSS compilation, static files.
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(sassMiddleware({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: false,
    sourceMap: true,
    outputStyle: 'compressed'
}));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging setup
app.use((req: express.Request, res: express.Response, next: Function) => {
    console.log('\n');
    appLogger(`${req.method} ${req.url} HTTP/${req.httpVersion} : ${res.statusCode}`);
    next();
});

// Routes
for (const [path, routerFactory] of Object.entries(routes)) {
    app.use(path, routerFactory(pool, routesLogger));
}

// Handle errors
app.use((req: express.Request, res: ResponseWithLayout) => {
    if (res.statusCode === 500) {
        render(
            req,
            res,
            'common/coded_err',
            {
                name: 'Server Error',
                description: 'The server encountered an internal error while serving your request.'
            },
            { pool }
        );
    } else {
        render(
            req,
            res,
            'common/coded_err',
            {
                name: 'Not Found',
                description: 'The page you requested could not be found.'
            },
            { pool }
        );
    }
});

(async () => {
    await queries(pool, [[], []], "SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION,ALLOW_INVALID_DATES';", "SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION,ALLOW_INVALID_DATES';");

    app.listen(config.port);
    appLogger(chalk.bold.green(`Listening on ${config.port}.`));
})();
