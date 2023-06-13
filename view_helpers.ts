import et from 'express';
import mt from 'mysql2';
import { ResponseWithLayout } from './definitions';

export default (req: et.Request, _res: ResponseWithLayout, _pool: mt.Pool) => {
    /**
     * Dumb pluralization function - just adds 's' to the string if count is not 1.
     * @param singular The singular form of the word you wish to pluralize.
     * @param count The number of instances to return a word form for.
     */
    const pluralize = (singular: string, count: number): string => {
        return count === 1 ? singular : singular + 's';
    };

    /**
     * Get the value of a parameter from the request.
     * @param name The name of the parameter to return.
     * @param defaultValue A default value to return instead of a value if none can be found.
     */
    const params = (name: string, defaultValue?: any): string => {
        return req.body[name] || req.query[name] || req.params[name] || defaultValue;
    };

    /**
     * Return all parsed query string parameters at once.
     */
    const queryParams = (): {} => {
        return req.query;
    };

    /**
     * Serialize parameters in an object to a query string format.
     * @param params An object containing parameters to serialize.
     */
    const serializeParams = (params: {}): string => {
        const list = Object.keys(params).map((k) => `${k}=${params[k]}`);
        return `?${list.join('&')}`;
    };

    /**
     * Capitalize the first letter of a string.
     * @param str The string to which to apply a capital letter.
     */
    const capitalizeFirst = (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    /**
     * Given a string, return a human-readable version of it by stripping some punctuation.
     * @param str The string to make human-readable.
     */
    const humanize = (str: string): string => {
        return str.replace(/[-_\+]/g, ' ');
    };

    /**
     * Ruby-style strftime for JS dates
     * @param dt The date object to format.
     * @param format A format string specifying the output format.
     */
    const strftime = (dt: Date, format: string): string => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const mappers = {
            'S': () => dt.getSeconds().toString().padStart(2, '0'),
            'L': () => dt.getMilliseconds().toString().padStart(3, '0'),
            's': () => Math.floor(dt.getTime() / 1000),

            'M': () => dt.getMinutes().toString().padStart(2, '0'),

            'H': () => dt.getHours().toString().padStart(2, '0'),
            'I': () => (dt.getHours() % 12).toString().padStart(2, '0'),
            'k': () => dt.getHours().toString().padStart(2, ' '),
            'l': () => (dt.getHours() % 12).toString().padStart(2, ' '),

            'a': () => days[dt.getDay()].substr(0, 3),
            'A': () => days[dt.getDay()],
            'd': () => dt.getDate().toString().padStart(2, '0'),
            'e': () => dt.getDate(),

            'b': () => months[dt.getMonth()].substr(0, 3),
            'B': () => months[dt.getMonth()],
            'm': () => (dt.getMonth() + 1).toString().padStart(2, '0'),

            'y': () => dt.getFullYear().toString().substr(2, 2),
            'Y': () => dt.getFullYear(),

            'p': () => dt.getHours() < 12 ? 'am' : 'pm',
            'P': () => dt.getHours() < 12 ? 'AM' : 'PM',

            '%': () => '%'
        };

        const chars = format.split('');
        let formatted = '';
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '%') {
                i += 1;
                const control = chars[i];
                if (!!mappers[control]) {
                    formatted += mappers[control].call(dt);
                } else {
                    formatted += `%${control}`;
                }
            } else {
                formatted += chars[i];
            }
        }
        return formatted;
    };

    /**
     * Convert a number to a user-friendly currency value, using the specified currency. Will always use decimal values.
     * @param num The number to convert.
     */
    const numberToCurrency = (num: number, units?: string): string => {
        return `${units || '£'}${num.toFixed(2)}`;
    };

    return {
        pluralize,
        params,
        capitalizeFirst,
        humanize,
        strftime,
        queryParams,
        serializeParams,
        numberToCurrency
    };
};
