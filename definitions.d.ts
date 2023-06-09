import * as et from 'express';
import type { ParsedQs } from 'qs';

type SortOrder = 'asc' | 'desc';

type SortType = 'alpha' | 'date_signed';

interface AuthRedirectRequestQs extends ParsedQs {
    code: string;
    state: string;
}

interface MainRequestQs extends ParsedQs {
    order?: SortOrder;
    sort?: SortType;
}

interface SignRequestBody {
    display_name?: string;
    letter?: string;
}

interface ResponseWithLayout extends et.Response {
    statusCode: number;

    /**
     * Specify a layout file to be used in the response.
     * @param layout_file The path to your layout, relative to your views directory.
     * @param data Local variables to be passed on to res.render.
     * @param blocks Configuration for each yielded section from your layout.
     * @param callback An optional callback to be passed to res.render.
     */
    layout(layout_file: string, data: object, blocks: object, callback?: Function): undefined;
}
