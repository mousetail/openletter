import createDebug from 'debug';

import { query } from '../query_helpers';
import { QueryIntermediate } from './query_intermediate';
import mt from 'mysql2';

const debug = createDebug('app:models:base');

/**
 * Array#map, but for objects.
 * @param o the object to map through
 * @param cb a callback to call for each value - receives key and value as params
 * @returns {Array} containing the mapped values
 */
export const objectMap = <T extends object, U extends (k: string, v: T[keyof T]) => unknown>(o: T, cb: U): Array<any> => {
    const keys = Object.keys(o);
    const result = [];
    keys.forEach((k) => {
        const value = o[k];
        const returned = cb(k, value);
        result.push(returned);
    });
    return result;
};

export class BaseModel {
    id: number;
    /**
   * Internal. The DB table name for the current model. Models extending this class should override both the static
   * and instance forms of this.
   * @returns {string}
   */
    static get tableName(): string {
        return '';
    }

    static _query: QueryIntermediate;

    static get queryBuilder(): QueryIntermediate {
        return this._query || null;
    }

    static set queryBuilder(val: QueryIntermediate) {
        this._query = val;
    }

    /**
   * Internal. The DB table name for the current model, reproduced on the instance level.
   * @returns {string}
   */
    get tableName(): string {
        return '';
    }

    static _pool: mt.Pool;

    /**
   * Internal. The database connection pool. App initialization must set this.
   * @returns {*}
   */
    static get pool(): mt.Pool {
        return this._pool;
    }

    /**
   * Set the database connection pool. This should be done in app initialization and pretty much left alone
   * after that.
   * @param val a database connection pool
   */
    static set pool(val: mt.Pool) {
        this._pool = val;
    }

    /**
   * Destroy all records in the collection.
   * @param col a collection of model instances to destroy
   */
    static async destroyAll(col: Array<BaseModel>): Promise<boolean> {
        if (!col || col.length <= 0) {
            return true;
        }

        const ids = col.map((x) => x.id);
        let values = new Array(ids.length).fill('?').join(', ');
        values = `(${values})`;
        const params = ids;
        params.push(ids.length);
        const data = await query(BaseModel.pool, [params],
            `DELETE FROM ${this.tableName} WHERE id IN ${values} LIMIT ?;`);
        const { err } = data[0];
        return !err;
    }

    /**
   * Add a pagination clause to the query.
   * @param page the 1-based page index to return
   * @param per_page the number of results to include in a single page
   * @param order whether to order the results ascending ('ASC') or descending ('DESC', default) before returning
   *              a page.
   * @returns {BaseModel} so that you can continue chaining methods on the end of it.
   */
    static page(page: number, per_page: number, order: { field?: string, direction: 'ASC' | 'DESC' } = { direction: 'ASC' }): typeof BaseModel {
        order.field = order.field || 'id';
        const offset = (page - 1) * per_page;
        if (this.queryBuilder) {
            this.queryBuilder = this.queryBuilder.order([order.field, order.direction === 'ASC' ? 0 : 1]).limit(per_page).offset(offset);
        } else {
            this.queryBuilder = new QueryIntermediate(this).order([order.field, order.direction === 'ASC' ? 0 : 1]).limit(per_page).offset(offset);
        }
        return this;
    }

    /**
   * Count the number of records in the query currently built on this instance.
   */
    static async count(): Promise<number> {
        const selected = this.getSelected();
        const results = await this.select('COUNT(*) AS ct').getUncleared() as (BaseModel & { ct: number })[];
        this.select(...selected); // Reset the select list on the queued query so that queries without explicit SELECTs still work afterwards
        return results[0].ct;
    }

    /**
   * INSERT shortcut. Adds a row to the database and returns a model instance.
   * @param attribs an object containing attributes to set on the new instance
   * @returns a model instance
   */
    static async create(attribs: object): Promise<BaseModel> {
        const instance = new this(attribs);
        const success = await instance.save();
        if (success) {
            return instance;
        }

        throw new Error('Failed save');
    }

    /**
   * Perform a SELECT query with specified WHERE conditions.
   * @param conditions an object containing conditions to match
   * @param limit (optional) a number of records to limit to
   * @param joiner (optional, default AND) the SQL keyword to join conditions with (AND, OR, etc)
   * @returns {BaseModel} itself so that you can continue chaining methods on the end of it.
   */
    static where(conditions: object | string, { limit, joiner = 'AND' }: { limit?: number, joiner?: string } = {}): typeof BaseModel {
        if (this.queryBuilder) {
            this.queryBuilder = this.queryBuilder.where(conditions, ` ${joiner} `).limit(limit);
        } else {
            this.queryBuilder = new QueryIntermediate(this).where(conditions, ` ${joiner} `).limit(limit);
        }
        return this;
    }

    /**
   * Add an escaped parameter to a raw WHERE clause (i.e. model.where('string')).
   * @param value the value to escape and add to the query
   */
    static whereParameter(value: any): typeof BaseModel {
        this.queryBuilder.whereParameter(value);
        return this;
    }

    /**
   * Add an INNER JOIN to the query.
   * @param toTable the table to join the current model to
   * @param sourceColumn the column on _this_ model to use for an equality join
   * @param targetColumn the column on the target table (i.e. toTable) to use for the equality join
   * @param as an optional table alias
   * @param joinType the type of join to use - INNER, LEFT, RIGHT, OUTER etc
   * @returns {BaseModel} itself so that you can continue chaining methods on the end of it.
   */
    static join(toTable: string, sourceColumn: string | string[], targetColumn: string | string[], { as = null, joinType = null }: { as?: string, joinType?: string } = {}): typeof BaseModel {
        if (this.queryBuilder) {
            this.queryBuilder = this.queryBuilder.join(toTable, sourceColumn, targetColumn, { as, joinType });
        } else {
            this.queryBuilder = new QueryIntermediate(this).join(toTable, sourceColumn, targetColumn, { as, joinType });
        }
        return this;
    }

    /**
   * Add specific select fields to the query.
   * @param fields the fields to select. WILL NOT BE ESCAPED.
   * @returns {BaseModel} itself so that you can continue chaining methods on the end of it.
   */
    static select(...fields: Array<string>): typeof BaseModel {
        if (this.queryBuilder) {
            this.queryBuilder = this.queryBuilder.select(fields);
        } else {
            this.queryBuilder = new QueryIntermediate(this).select(fields);
        }
        return this;
    }

    /**
   * Get the fields that are currently queued to be selected on this query.
   */
    static getSelected(): Array<string> {
        return this.queryBuilder ? this.queryBuilder.getSelected() : [];
    }

    /**
   * Add ordering to the query being built.
   * @param field the column name to order by
   * @param dir ASC or DESC
   * @returns {BaseModel} itself so that you can continue chaining methods on the end of it.
   */
    static order(field: string, dir: string = 'ASC', raw: boolean = false): typeof BaseModel {
        const value: Array<any> = [field, dir === 'ASC' ? 0 : 1];

        if (raw) {
            value.push(true);
        }

        if (this.queryBuilder) {
            this.queryBuilder = this.queryBuilder.order(value);
        } else {
            this.queryBuilder = new QueryIntermediate(this, {}).order(value);
        }
        return this;
    }

    /**
   * Find a single record having one or more specified attributes.
   * @param {Object} attributes an object of attributes for which you wish to find a record
   * @returns {BaseModel?} a single model instance or null
   */
    static async findBy(attributes: object): Promise<BaseModel | null> {
        const results = await this.where(attributes).get();
        if (results.length) {
            return results[0];
        } else {
            return null;
        }
    }

    /**
   * Find a single record by its ID.
   * @param {Number} id the ID of the record you wish to find
   * @returns {BaseModel?} a single model instance or null
   */
    static async find(id: number): Promise<BaseModel | null> {
        const result = await this.findBy({ id });
        return result;
    }

    /**
   * Execute the query queued on this model and return the result.
   * @returns {Array} an array of model instances
   */
    static get(): Promise<Array<BaseModel>> {
        if (this.queryBuilder) {
            const query = this.queryBuilder;
            this.queryBuilder = null;
            return query.execute(BaseModel.pool);
        } else {
            const query = new QueryIntermediate(this);
            return query.execute(BaseModel.pool);
        }
    }

    /**
   * Execute the query queued on this model and return the result, without clearing the queued query.
   * @returns {Array} an array of model instances
   */
    static getUncleared(): Promise<Array<BaseModel>> {
        if (this.queryBuilder) {
            const query = this.queryBuilder;
            return query.execute(BaseModel.pool);
        } else {
            const query = new QueryIntermediate(this);
            return query.execute(BaseModel.pool);
        }
    }

    attribs: { id: number };

    /**
   * Construct an instance of the model. Does not save it to the database - call save().
   * @param attribs an object of attributes to set on the new instance
   */
    constructor(attribs: object) {
        this.attribs = attribs as { id: number };
        this.setShortcutMethods();
    }

    /**
   * Internal. Set up shortcut methods for model attributes (i.e. so model.id works rather than model.attribs.id).
   */
    setShortcutMethods(): void {
        Object.keys(this.attribs).forEach((k) => {
            this[k] = this.attribs[k];
        });
    }

    /**
   * Save a previously-constructed model instance to the database.
   * @returns {Boolean} indicating whether the save was successful.
   */
    async save(): Promise<boolean> {
        const names = QueryIntermediate.escapeNames(Object.keys(this.attribs)).join(', ');
        const values = objectMap(this.attribs, (_, v) => v);
        const params = new Array(values.length).fill('?').join(', ');
        const data = await query(BaseModel.pool, [values], `INSERT INTO ${this.tableName} (${names}) VALUES (${params});`);
        const { err } = data[0];

        if (err) {
            debug(err);
            return false;
        }

        const sql = new QueryIntermediate(this.constructor).where(this.attribs).order(['created_at', 1]).limit(1);
        try {
            const results = await sql.execute(BaseModel.pool);
            this.attribs = results[0].attribs;
            this.setShortcutMethods();
            return true;
        } catch (err) {
            debug(err);
            return false;
        }
    }

    /**
   * Update the model's attributes and save them to the database.
   * @param attribs new attributes for the model instance.
   * @returns {Boolean} indicating if the update succeeded.
   */
    update(attribs: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            let params;
            let values;
            if (attribs instanceof Object) {
                attribs.updated_at = new Date().toISOString().replace(/\.\d{3,4}Z$/, '');
                params = objectMap(attribs, (k) => `${QueryIntermediate.escapeName(k)} = ?`).join(', ');
                values = objectMap(attribs, (_, v) => v);
            } else if (Array.isArray(attribs)) {
                attribs.push(['updated_at', new Date().toISOString().replace(/\.\d{3,4}Z$/, '')]);
                params = attribs.map((x) => x[0]).join(', ');
                values = attribs.map((x) => x[1]);
            }

            values.push(this.attribs.id);
            const data = await query(BaseModel.pool, [values],
                `UPDATE ${this.tableName} SET ${params} WHERE id = ?;`);
            const { err } = data[0];
            if (err) {
                console.error(err);
                resolve(false);
            } else {
                this.attribs = Object.assign(this.attribs, attribs);
                this.setShortcutMethods();
                resolve(true);
            }
        });
    }

    /**
   * Delete this instance from the database.
   * @returns {Boolean} indicating whether the deletion succeeded.
   */
    async destroy(): Promise<boolean> {
        let data;
        if (this.attribs.id) {
            data = await query(BaseModel.pool, [[this.attribs.id]],
                `DELETE FROM ${this.tableName} WHERE id = ? LIMIT 1;`);
        } else {
            const where = [];
            const values = [];
            Object.keys(this.attribs).forEach((k) => {
                where.push(`${k} = ?`);
                values.push(this.attribs[k]);
            });
            const whereClause = where.join(' AND ');
            const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause} LIMIT 1;`;
            data = await query(BaseModel.pool, [values], sql);
        }
        const { err } = data[0];
        if (err) {
            return false;
        }

        this.attribs.id = null;
        return true;
    }
}
