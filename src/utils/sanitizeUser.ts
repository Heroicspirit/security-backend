export const sanitizeUser = (user: any, isAdmin: boolean = false) => {
    const sensitiveFields = [
        'password',
        'mfaSecret',
        'passwordHistory',
        'failedLoginAttempts',
        'lockUntil',
        'lastFailedLogin'
    ];

    const sanitized = { ...user };

    // Always hide these fields
    sensitiveFields.forEach(field => {
        delete sanitized[field];
    });

    // Hide additional fields for non-admin users
    if (!isAdmin) {
        const adminOnlyFields = [
            'passwordLastChanged',
            'passwordExpiryDays',
            'googleId'
        ];
        adminOnlyFields.forEach(field => {
            delete sanitized[field];
        });
    }

    return sanitized;
};
