// src/frontend/src/components/common/ErrorBoundary.js
/* =================================================================
 * EDMS 1CAR - Enhanced Error Boundary Component (Optimized Version)
 *
 * REFACTOR:
 * - Updated getUserId() to read from 'user_context' in localStorage,
 * which is now reliably set by the optimized AuthContext.
 * ================================================================= */

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            eventId: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error: error, errorInfo: errorInfo });
        
        const errorDetails = {
            // ...
            userId: this.getUserId() // Call the updated function
        };
        // ... (rest of the logic is unchanged)
    }

    // --- Helper & Reporting Methods ---

    getUserId() {
        try {
            // Read from localStorage, where AuthContext now stores minimal info
            const userContext = localStorage.getItem('user_context');
            if (userContext) {
                const parsed = JSON.parse(userContext);
                return parsed.id || 'anonymous';
            }
        } catch (e) {
            console.error('Error parsing user context from localStorage:', e);
        }
        return 'anonymous';
    }

    // ... (The rest of the component, including render logic, remains unchanged)
    render() {
        if (this.state.hasError) {
            // ... (The entire Fallback UI JSX remains the same)
        }
        return this.props.children;
    }
}

export default ErrorBoundary;