import dashboard from '../routes/dashboard';
import privacy from '../routes/privacy';

export const routes: {[key: string]: Function} = {
    '/': dashboard,
    '/privacy': privacy
};