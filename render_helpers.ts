import createDebug from 'debug';
import ejs from 'ejs';

const renderLogger = createDebug('app:render');

import {ResponseWithLayout} from './definitions';
import et from 'express';
import mt from 'mysql2';
import viewHelpers from './view_helpers';
import {BaseModel} from './models/base';

/**
 * Render a specified view within a specified or default (application) layout.
 * @param req the HTTP request object
 * @param res the HTTP response object
 * @param view the path to the view to render, relative to views/ and excluding the .ejs suffix.
 * @param locals local variables to make available to the layout and view
 * @param layout optional - the path to the layout to render, relative to views/layouts/ and excluding the .ejs suffix
 * @param pool optional - a database connection pool
 * @param status optional - a numeric HTTP status to return
 */
export const render = (req: et.Request, res: ResponseWithLayout, view: string | object | Array<any>, locals: Object = {},
    {layout, pool, status}: {layout?: string, pool: mt.Pool, status?: number}) => {
    if (status) {
        res.status(status);
    }

    if (typeof (view) === 'string') {
        const fullLayout = `layouts/${layout || 'application'}`;
        renderLogger(`Rendering ${view} within ${fullLayout}.`);

        // Because the default layout requires a title
        // but individual actions might not set it, make sure we have a default.
        let localVars = locals;
        localVars.title = localVars.title || '';

        localVars = Object.assign(localVars, viewHelpers(req, res, pool));
        res.layout(fullLayout, localVars, {content: {block: view, data: localVars}});
    } else {
    // If view isn't a string, assume it's intended to be sent as JSON.
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(view));
    }
};

/**
 * Mostly just a wrapper round EJS.renderFile to promisify it so it can be awaited.
 * @param file EJS view file path to render
 * @param data local variables for the view
 * @param options EJS rendering options
 * @returns {Promise} always resolves, gets passed an object with err and str params.
 */
export const renderInternalView = (file, data, options = {}) => {
    return new Promise((resolve) => {
        ejs.renderFile(file, data, options, (err, str) => {
            resolve({err, str});
        });
    });
};

/**
 * Shortcut to render for error pages.
 * @param req the HTTP request object
 * @param res the HTTP response object
 * @param err the error string or object
 * @param pool optional - a database connection pool
 */
export const error = (req: et.Request, res: ResponseWithLayout, err: any, pool: mt.Pool) => {
    render(req, res, 'common/error', {title: 'Error', error: err}, {pool});
};
