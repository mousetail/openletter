import express from 'express';
import mt from 'mysql2';
import { render } from '../render_helpers';
import type { ResponseWithLayout } from '../definitions';
import type { Debugger } from 'debug';
const router = express.Router();

export default (pool: mt.Pool, _log: Debugger): express.Router => {
    router.get('/', (req: express.Request, res: ResponseWithLayout) => {
        render(req, res, 'privacy/policy', {}, { layout: 'privacy', pool });
    });

    return router;
};
