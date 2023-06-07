import type { Config } from '../config/configuration';
import type { Signatory } from '../models/signatory';

/**
 * Builds the URL for requesting the Stack Exchange's oauth endpoint
 */
export const getAuthRedirectURL = (
    config: Config,
    signatory: Signatory,
    letter: string
) => {
    const client_id = config.getSiteSetting('clientId');
    const redirect_uri = config.getSiteSetting('redirectUri');

    const url = new URL('https://stackexchange.com/oauth');
    url.search = new URLSearchParams({
        client_id,
        redirect_uri,
        scope: '',
        state: `${signatory.id}|${letter}`,
    }).toString();

    return url.toString();
};
