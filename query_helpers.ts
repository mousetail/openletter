import createDebug from 'debug';

import mt from 'mysql2';
import et from 'express';
import chalk from 'chalk';

const queryLogger = createDebug('app:query');
createDebug('app:helpers');

/**
 * Detect if a value is an object literal, i.e. declared with a literal or created with `new Object`.
 * @param obj a value to test
 */
export const isObjectLiteral = (obj: any): boolean => {
    let _test = obj;
    return (typeof obj !== 'object' || obj === null ?
        false :
        (() => {
            while (!false) {
                if (Object.getPrototypeOf(_test = Object.getPrototypeOf(_test)) === null) {
                    break;
                }
            }
            return Object.getPrototypeOf(obj) === _test;
        })());
};

/**
 * Pretty-print a value for display in terminal environments.
 * @param val a value to format
 */
export const pp = (val: any): string => {
    if (typeof val === 'string') {
        return `"${val}"`;
    } else if (val instanceof Array) {
        return `[${val.map((i) => pp(i)).join(', ')}]`;
    } else if (isObjectLiteral(val)) {
        return `{${Object.keys(val).map((k) => `${pp(k)}: ${pp(val[k])}`).join(', ')}}`;
    } else {
        return !!val ? val.toString() : `${val}`;
    }
};

/**
 * Array.filter for objects. The callback function will be passed both key and value as parameters.
 * @param obj the object to filter
 * @param fn the callback function to select which keys to retain
 */
export const objectFilter = (obj: {}, fn: Function): {} => {
    const result = {};
    Object.keys(obj).forEach((k) => {
        if (fn(k, obj[k])) {
            result[k] = obj[k];
        }
    });
    return result;
};

/**
 * Run a series of database queries.
 * @param pool a database connection pool
 * @param params query parameters to escape and insert into the query
 * @param queries the queries to execute
 * @returns {Promise} the value passed when resolved is an array of query responses, which have the format
 *          {err, rows, fields}.
 */
export const queries = (pool: mt.Pool, params: Array<any> = [], ...queries: Array<string>): Promise<Array<any>> => {
    // ESLint thinks I can't pass an array to Promise.all. Watch me, ESLint.
    return Promise.all(queries.map((q) => {
        return new Promise((resolve) => {
            const idx = queries.indexOf(q);
            const queryParams = params[idx];
            pool.query(q, queryParams, (err, rows, fields) => {
                if (err) {
                    // LOG ALL THE THINGS. Log as much as possible to help diagnostics.
                    queryLogger(chalk.red('▮ FAILED QUERY LOG ▮'));
                    queryLogger(`${chalk.red('▮')} ${q}`);
                    queryLogger(`${chalk.red('▮')} ${pp(queryParams)}`);
                    queryLogger(`${chalk.red('▮')} ${err}`);
                    queryLogger(chalk.red('▮ END FAILED QUERY ▮'));
                    resolve({err});
                } else {
                    queryLogger(`${chalk.green('●')} ${q} ${pp(queryParams)}`);
                    resolve({err: null, rows, fields});
                }
            });
        });
    }));
};

export const query = queries;

/**
 * Parameter validator. Given an object containing requirements for a set of parameters, will run validations and
 * return the parameters along with any errors.
 * @param req the HTTP request object
 * @param options the requirements object - keys are parameter names, values are objects defining what checks you want
 * @returns {Object} containing the parameters requested plus an errors key containing an array of any errors
 */
export const parameters = (req: et.Request, options: object): object => {
    const body = req.body;
    const names = Object.keys(options);
    const final = {};
    const errors = [];
    names.forEach((x) => {
        const opts = options[x];
        const received = body[x];

        const checks = Object.keys(opts);
        const results = [];
        checks.forEach((c) => {
            switch (c) {
                case 'required':
                    if (opts[c] && received && received !== '') {
                        results.push(true);
                    } else if (!opts[c]) {
                        results.push(true);
                    } else {
                        results.push(false);
                        errors.push(`${x} must be present`);
                    }
                    break;
                case 'length':
                    if (received && received.length >= opts[c]) {
                        results.push(true);
                    } else if (!received) {
                        results.push(true);
                    } else {
                        results.push(false);
                        errors.push(`${x} must be longer than ${opts[c]} characters`);
                    }
                    break;
                case 'compare':
                    // Mainly for things like password confirmation fields.
                    if (received && body[opts[c]] && received === body[opts[c]]) {
                        results.push(true);
                    } else if (!received) {
                        results.push(true);
                    } else {
                        results.push(false);
                        errors.push(`${x} doesn't match ${opts[c]}`);
                    }
                    break;
                default:
                    break;
            }
        });

        if (!results.some((x) => !x)) {
            final[x] = received;
        }
    });

    return Object.assign(final, {errors});
};

/**
 * Properly removes an item from an array - that is, removes it and shifts subsequent elements up a place, as
 * opposed to simply nullifying the index as the delete operator does.
 * @param arr the array to remove an item from
 * @param index the index of the item to remove
 * @returns {Array} an array without the item previously at the specified index
 */
export const removeFromArray = (arr: Array<any>, index: number) => {
    return arr.filter((_el, i) => i !== index);
};
