export const RoleErrorCodes = {
    NOT_FOUND: 'ROLE_NOT_FOUND',
    NAME_ALREADY_EXISTS: 'ROLE_NAME_ALREADY_EXISTS',
    TYPE_ALREADY_EXISTS: 'ROLE_TYPE_ALREADY_EXISTS'
};

export const RoleTypes = {
    // SUPER_ADMIN removed — ORG_ADMIN is highest privilege
    ORG_ADMIN: 'ORG_ADMIN',
    PROJECT_ADMIN: 'PROJECT_ADMIN',
    PENTESTER: 'PENTESTER',
};
