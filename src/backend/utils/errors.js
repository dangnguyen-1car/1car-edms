// src/backend/utils/errors.js

class ExtendableError extends Error {
  constructor(message, status, code, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.isOperational = isOperational; // Operational errors are expected, not programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ExtendableError {
  constructor(message = 'Validation Failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors; // To hold specific field validation errors
  }
}

class NotFoundError extends ExtendableError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends ExtendableError {
  constructor(message = 'Conflict with existing resource') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class AuthenticationError extends ExtendableError {
  constructor(message = 'Authentication Failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends ExtendableError {
  constructor(message = 'Authorization Failed: You do not have permission to perform this action.') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

module.exports = {
  ExtendableError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
};