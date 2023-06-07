import express from 'express';
import mt from 'mysql2';
import { URLSearchParams } from 'url';
import { render, error } from '../render_helpers';
import config from '../config/config';
import { Signatory } from '../models/signatory';
import type { AuthRedirectRequestQs, ResponseWithLayout, SignRequestBody } from '../definitions';
import crypto from 'crypto';
import type { Debugger } from 'debug'
import { getAuthRedirectURL } from '../helpers/auth';
const fetch = require('node-fetch');
const router = express.Router(); // eslint-disable-line new-cap

const minimumDate = new Date('2023-06-05T04:00:00Z')

export default (pool: mt.Pool, _log: Debugger): express.Router => {
    router.get('/', async (req: express.Request, res: ResponseWithLayout) => {
        const signatories = (
            await Signatory.where(`se_acct_id IS NOT NULL AND letter = 'main'`).order('is_moderator DESC, is_former_moderator DESC, RAND()', '', true).get()
        ).map((signatory: Signatory) => {
            return {
                ...signatory,
                created_at: signatory.created_at >= minimumDate ? signatory.created_at : minimumDate,
                original_created_at: signatory.created_at
            }
        });
        const etag = crypto.createHash('sha256').update(`${config.getSiteSetting('letterVersion')}-${signatories.length}`).digest('hex');
        res.setHeader('ETag', etag);
        render(req, res, 'dashboard/dash', { signatories }, { pool });
    });


    router.get('/faq-4ds21xFq', async (req: express.Request, res: ResponseWithLayout) => {
        render(req, res, 'dashboard/faq', {}, { pool });
    });

    router.get('/favicon.ico', async (_req: express.Request, res: ResponseWithLayout) => {
        res.redirect('/icon.png');
    });

    router.post('/sign', async (req: express.Request<any, any, SignRequestBody>, res: ResponseWithLayout) => {
        const displayName = req.body['display_name'] || null;
        const letter = req.body['letter'] || 'main';
        if (displayName.indexOf('♦') !== -1) {
            error(req, res, 'You may not use the ♦ character in your display name.', pool);
            return;
        }
        if (displayName.indexOf('◊') !== -1) {
            error(req, res, 'You may not use the ◊ character in your display name.', pool);
            return;
        }
        const signatory: Signatory = await <Promise<Signatory>>Signatory.create({ display_name: displayName, letter });
        res.redirect(getAuthRedirectURL(config, signatory, letter));
    });

    router.get('/auth-redirect', async (req: express.Request<any, any, any, AuthRedirectRequestQs>, res: ResponseWithLayout) => {
        const code = req.query['code'];
        const state = req.query['state'];
        const signatoryId = state.split('|')[0];
        const letter = state.split('|')[1];

        const params = new URLSearchParams();
        params.append('client_id', config.getSiteSetting('clientId'));
        params.append('client_secret', config.getSiteSetting('clientSecret'));
        params.append('code', code);
        params.append('redirect_uri', config.getSiteSetting('redirectUri'));

        const key = config.getSiteSetting('key');

        try {
            const resp = await fetch('https://stackexchange.com/oauth/access_token/json', {
                method: 'POST',
                body: params
            });
            const data = await resp.json();
            const accessToken = data.access_token;

            let page = 1, items = [], has_more = true;
            while (has_more) {
                const assocResp = await fetch(`https://api.stackexchange.com/2.2/me/associated?access_token=${accessToken}&filter=!*L3o9HqJx_y6B8td&page=${page}&key=${key}`);
                const assocData = await assocResp.json();
                items = items.concat(assocData.items);
                has_more = assocData.has_more;
                page++;
            }

            const accountId = items[0].account_id;
            const isModerator = items.filter(i => i.user_type === 'moderator').length > 0;

            const signatory: Signatory = await <Promise<Signatory>>Signatory.find(Number.parseInt(signatoryId));
            const success = await signatory.update({ se_acct_id: accountId, is_moderator: isModerator });

            if (success) {
                res.redirect(letter === 'main' ? '/' : `/${letter}`);
            }
            else {
                error(req, res, 'You have already signed this letter.', pool);
            }
        }
        catch (err) {
            console.error(err);
            error(req, res, 'Unknown server error. This problem has been logged.', pool);
        }
    });

    return router;
};
