/**
 * =================================================================
 * EDMS 1CAR - JWT Configuration (Fixed for 431 Error)
 * Optimized JWT tokens to prevent header size issues
 * =================================================================
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'edms-1car-secret-key-2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'edms-1car-refresh-secret-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Token blacklist for logout (simple in-memory store for 40 users)
const tokenBlacklist = new Set();
const userTokens = new Map(); // userId -> Set of tokens

/**
 * Generate optimized token pair with minimal payload
 */
function generateTokenPair(user) {
    try {
        // Minimal payload to reduce token size
        const accessPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            department: user.department,
            type: 'access'
        };

        const refreshPayload = {
            id: user.id,
            email: user.email,
            tokenId: crypto.randomUUID(),
            type: 'refresh'
        };

        // Generate tokens
        const accessToken = jwt.sign(
            accessPayload,
            JWT_SECRET,
            {
                expiresIn: JWT_EXPIRES_IN,
                issuer: 'edms-1car',
                audience: 'edms-1car-users'
            }
        );

        const refreshToken = jwt.sign(
            refreshPayload,
            JWT_REFRESH_SECRET,
            {
                expiresIn: JWT_REFRESH_EXPIRES_IN,
                issuer: 'edms-1car',
                audience: 'edms-1car-users'
            }
        );

        // Store user tokens for management
        if (!userTokens.has(user.id)) {
            userTokens.set(user.id, new Set());
        }
        userTokens.get(user.id).add(accessToken);

        return {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN,
            tokenType: 'Bearer'
        };

    } catch (error) {
        throw new Error('Token generation failed: ' + error.message);
    }
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
    try {
        // Check blacklist first
        if (tokenBlacklist.has(token)) {
            throw new Error('Token has been revoked');
        }

        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'edms-1car',
            audience: 'edms-1car-users'
        });

        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw new Error('Token verification failed: ' + error.message);
    }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
    try {
        if (tokenBlacklist.has(token)) {
            throw new Error('Refresh token has been revoked');
        }

        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'edms-1car',
            audience: 'edms-1car-users'
        });

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw new Error('Refresh token verification failed: ' + error.message);
    }
}

/**
 * Revoke single token
 */
function revokeToken(token) {
    tokenBlacklist.add(token);
    
    // Remove from user tokens
    for (const [userId, tokens] of userTokens.entries()) {
        if (tokens.has(token)) {
            tokens.delete(token);
            if (tokens.size === 0) {
                userTokens.delete(userId);
            }
            break;
        }
    }
}

/**
 * Revoke all user tokens
 */
function revokeAllUserTokens(userId) {
    const tokens = userTokens.get(userId);
    if (tokens) {
        tokens.forEach(token => tokenBlacklist.add(token));
        userTokens.delete(userId);
    }
}

/**
 * Clean up expired tokens (run periodically)
 */
function cleanupExpiredTokens() {
    const now = Math.floor(Date.now() / 1000);
    
    for (const token of tokenBlacklist) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp < now) {
                tokenBlacklist.delete(token);
            }
        } catch (error) {
            // Invalid token, remove it
            tokenBlacklist.delete(token);
        }
    }
}

// Cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = {
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    revokeToken,
    revokeAllUserTokens,
    cleanupExpiredTokens
};
