import type { Signatory } from '../models/signatory';

export interface SignatoryBreakdown {
    current_mods: number;
    former_mods: number;
    regular_users: number;
}

/**
 * Builds {@link SignatoryBreakdown} from a list of {@link Signatory}-like objects
 * @param signatories list of {@link Signatory}-like objects
 */
export const getSignatoryBreakdown = (
    signatories: Pick<Signatory, 'is_moderator'|'is_former_moderator'>[]
): SignatoryBreakdown => {
    const breakdown: SignatoryBreakdown = {
        current_mods: 0,
        former_mods: 0,
        regular_users: 0,
    };

    for (const signatory of signatories) {
        if (signatory.is_moderator) {
            breakdown.current_mods += 1;
        } else if (signatory.is_former_moderator) {
            breakdown.former_mods += 1;
        } else {
            breakdown.regular_users += 1;
        }
    }

    return breakdown;
};
