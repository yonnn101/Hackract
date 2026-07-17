export const MemberRole = {
    OWNER: 'owner', // Not in Enum but used in logic? Schema says role String default 'member'
    ADMIN: 'admin',
    MEMBER: 'member'
};

export const MemberErrorCodes = {
    NOT_FOUND: 'MEMBER_NOT_FOUND',
    ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS'
};
