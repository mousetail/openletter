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
export const render = async (req: et.Request, res: ResponseWithLayout, view: string | object | Array<any>, locals: Object = {},
    {layout, pool, status}: {layout?: string, pool: mt.Pool, status?: number}) => {
    if (status) {
        res.status(status);
    }

    if (typeof (view) === 'string') {
        const fullLayout = `layouts/${layout || 'application'}`;
        renderLogger(`Rendering ${view} within ${fullLayout}.`);

        // Because the default layout requires a title but individual actions might not set it, make sure we have a default.
        locals.title = locals.title || '';

        locals = Object.assign(locals, viewHelpers(req, res, pool));
        res.layout(fullLayout, locals, {content: {block: view, data: locals}});
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
export const renderInternalView = async (file, data, options = {}) => {
    return new Promise(async (resolve) => {
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

/**
 * Given a BaseModel instance with a query being built on it, will add pagination to the query, fetch
 * the results, and return the results and some pagination data necessary to build views.
 * @param collection a BaseModel instance with a query built on it but not get()ted yet
 * @param page the page of results to be returned
 * @param pagesize the number of results per page
 */
export const paginate = async (collection: typeof BaseModel, page: number, per_page: number, order: {field?: string, direction: 'ASC' | 'DESC'} = {direction: 'ASC'}):
                              Promise<{records: BaseModel[], pagination: {currentPage: number, totalPages: number}}> => {
    page = typeof page === 'number' ? page : parseInt(page, 10);
    per_page = typeof per_page === 'number' ? per_page : parseInt(per_page, 10);
    const count = await collection.count();
    const records = await collection.page(page, per_page, order).get();
    return {records, pagination: {currentPage: page, totalPages: Math.max(1, Math.ceil(count / per_page))}};
};
