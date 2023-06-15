import { query } from '../query_helpers';
import mt from 'mysql2';
import { BaseModel } from './base';


/**
 * We have both this and BaseModel because they handle different jobs - BaseModel handles being a useful ORM, while
 * QueryIntermediate handles constructing and issuing queries to the database. Lot of method signature duplication, but
 * two different purposes.
 *
 * QueryIntermediate works only for SELECT queries - those are usually the complex ones, so they appropriately have the
 * most levels of abstraction before we actually hit the database. INSERTs, UPDATEs, and DELETEs are comparatively
 * simple, so can be issued either by BaseModel or by controllers directly.
 */
export class QueryIntermediate {
    /**
   * Mostly internal, but might have some other uses. Escapes a database name (such as a table name). Use this for
   * anything that needs to go in backtick quotes.
   * @param name the name to escape
   * @returns {string} a sanitized version of the name
   */
    static escapeName(name: string): string {
        return `\`${name.replace(/`/g, '')}\``;
    }

    /**
   * Also mostly internal. Escape a whole array of database names at once.
   * @param names an Array of names to escape
   * @returns {Array} a copy of the array with all elements correctly escaped.
   */
    static escapeNames(names: Array<string>): Array<string> {
        return names.map((x) => `\`${x.replace(/`/g, '')}\``);
    }

    cls: any;
    params: { where: { _raw?: Array<any> }, limit: number, offset: number, order: Array<any>, joins: Array<any>, select?: Array<string> };
    opts: { whereJoiner: string };
    values: Array<any>;

    constructor(cls: any,
        { where = {}, limit = null, offset = null, order = [] }: { where?: object, limit?: number, offset?: number, order?: Array<any> } = {}) {
        this.cls = cls;
        this.params = { where, limit, offset, order, joins: [] };
        this.opts = { whereJoiner: ' AND ' };
        this.values = [];
    }

    where(conditions: object | string = {}, joiner: string = ' AND '): QueryIntermediate {
        if (conditions instanceof Object) {
            Object.assign(this.params.where, conditions);
        } else if (typeof (conditions) === 'string') {
            if (this.params.where._raw) {
                this.params.where._raw.push([conditions]);
            } else {
                this.params.where._raw = [];
                this.params.where._raw.push([conditions]);
            }
        }
        this.opts.whereJoiner = joiner;
        return this;
    }

    whereParameter(value: any): QueryIntermediate {
        if (this.params.where._raw) {
            this.params.where._raw[this.params.where._raw.length - 1].push(value);
        }
        return this;
    }

    limit(val: number): QueryIntermediate {
        this.params.limit = val;
        return this;
    }

    offset(val: number): QueryIntermediate {
        this.params.offset = val;
        return this;
    }

    order(val: Array<any>): QueryIntermediate {
        this.params.order = val;
        return this;
    }

    select(fields: Array<string>): QueryIntermediate {
        this.params.select = fields;
        return this;
    }

    getSelected(): Array<string> {
        return this.params.select || [];
    }

    join(toTable: string, sourceColumn: string | string[], targetColumn: string | string[], { as = null, joinType = null }: { as?: string, joinType?: string }) {
        const join: Array<any> = [toTable, sourceColumn, targetColumn];
        join.push({ as, joinType });
        this.params.joins.push(join);
        return this;
    }

    _createWhereClauses(o: { _raw?: string[] }, table?: string): Array<string> {
        let where = [];
        for (const key of Object.keys(o)) {
            if (key === '_raw') {
                continue;
            }

            if (Array.isArray(o[key])) {
                const col = QueryIntermediate.escapeName(key);
                let name = col;
                if (table) {
                    name = `${table}.${col}`;
                }

                if (o[key].length <= 0) {
                    where.push(`${name} IS NULL`);
                    continue;
                }

                let values = new Array(o[key].length).fill('?').join(', ');
                values = `(${values})`;
                where.push(`${name} IN ${values}`);
                this.values = this.values.concat(o[key]);
            } else if (o[key] instanceof Object) {
                where = where.concat(this._createWhereClauses(o[key], QueryIntermediate.escapeName(key)));
            } else if (o[key] === null) {
                const col = QueryIntermediate.escapeName(key);
                let name = col;
                if (table) {
                    name = `${table}.${col}`;
                    where.push(`${name} IS NULL`);
                }
            } else {
                const col = QueryIntermediate.escapeName(key);
                let name = col;
                if (table) {
                    name = `${table}.${col}`;
                }
                const value = o[key];
                where.push(`${name} = ?`);
                this.values.push(value);
            }
        }
        (o._raw || []).forEach((r) => {
            where.push(r);
        });
        return where;
    }

    _construct(): Array<any> {
        const tableName = QueryIntermediate.escapeName(this.cls.tableName);
        const select = this.params.select && this.params.select.length > 0 ? this.params.select.join(', ') : '*';
        let query = `SELECT ${select} FROM ${tableName}`;

        const joins = [];
        this.params.joins.forEach((x) => {
            let table = QueryIntermediate.escapeName(x[0]);
            const sourceCol = x[1] instanceof Array ?
                QueryIntermediate.escapeName(x[1][0]) + '.' + QueryIntermediate.escapeName(x[1][1]) :
                tableName + '.' + QueryIntermediate.escapeName(x[1]);
            const targetCol = x[2] instanceof Array ?
                QueryIntermediate.escapeName(x[2][0]) + '.' + QueryIntermediate.escapeName(x[2][1]) :
                table + '.' + QueryIntermediate.escapeName(x[2]);
            let { as = null, joinType = null } = x[3];

            if (as) {
                as = QueryIntermediate.escapeName(as);
                table += ` AS ${as}`;
            }

            joinType = joinType ? joinType : 'INNER';
            joins.push(`${joinType} JOIN ${table} ON ${sourceCol} = ${targetCol}`);
        });
        const joinString = joins.join(' ');
        if (joinString) {
            query += ` ${joinString}`;
        }

        const where = this._createWhereClauses(this.params.where);
        if (this.params.where._raw) {
            this.params.where._raw.forEach((x) => {
                where.push(x[0]);
                if (x.length >= 2) {
                    this.values.push(x[1]);
                }
            });
        }

        const whereString = where.length > 0 ? where.join(this.opts.whereJoiner) : null;
        if (whereString) {
            query += ` WHERE ${whereString}`;
        }

        if (this.params.order && this.params.order.length >= 2) {
            const field = this.params.order.length >= 3 ? this.params.order[0] :
                QueryIntermediate.escapeName(this.params.order[0]);
            const ordering = this.params.order[1] === 0 ? 'ASC' : 'DESC';
            query += ` ORDER BY ${field} ${ordering}`;
        }

        if (this.params.limit) {
            query += ' LIMIT ?';
            this.values.push(this.params.limit);
        }

        if (this.params.offset) {
            query += ' OFFSET ?';
            this.values.push(this.params.offset);
        }

        return [`${query};`, this.values];
    }

    async execute(pool: mt.Pool): Promise<Array<BaseModel>> {
        const queryData = this._construct();
        this.values = [];
        const data: any = await query(pool, [queryData[1]], queryData[0]);
        const { err, rows } = data[0];

        if (err) {
            throw err;
        }

        return rows.map((x) => new this.cls(x));
    }
}
