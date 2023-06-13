import { BaseModel } from './base';

export class Signatory extends BaseModel {
    id: number;
    se_acct_id: number;
    display_name: string;
    is_former_moderator: number;
    is_moderator: number;
    created_at: Date;
    updated_at: Date;

    static get tableName() {
        return 'signatories';
    }

    get tableName() {
        return 'signatories';
    }
}
