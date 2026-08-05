import { HttpStatus } from '@nestjs/common';
import { ResponseHelper } from '@shared/helpers/response.helper';

describe('ResponseHelper', () => {
  describe('success', () => {
    it('should return a default success response', () => {
      const data = { id: 1 };
      const response = ResponseHelper.success(data);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.message).toBe('Operación exitosa');
      expect(response.body).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('should return a custom success response', () => {
      const data = [1, 2];
      const response = ResponseHelper.success(data, {
        message: 'Custom message',
        status: HttpStatus.CREATED,
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.message).toBe('Custom message');
      expect(response.body).toEqual(data);
    });
  });

  describe('error', () => {
    it('should return a default error response', () => {
      const response = ResponseHelper.error('Something went wrong');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.message).toBe('Something went wrong');
      expect(response.error).toBeNull();
    });

    it('should extract error message from an Error object', () => {
      const error = new Error('Detail error');
      const response = ResponseHelper.error('Main error', { error });

      expect(response.error).toBe('Detail error');
    });

    it('should handle custom error objects with message property', () => {
      const error = { message: 'Custom object error' };
      const response = ResponseHelper.error('Main error', { error });
      expect(response.error).toBe('Custom object error');
    });
  });

  describe('notFound', () => {
    it('should format a notFound error with identifier', () => {
      const response = ResponseHelper.notFound('User', 123);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.message).toBe(
        "User con identificador '123' no encontrado",
      );
      expect(response.body).toEqual({ resource: 'User', identifier: 123 });
    });

    it('should format a notFound error without identifier', () => {
      const response = ResponseHelper.notFound('Resource');
      expect(response.message).toBe('Resource no encontrado');
    });
  });

  describe('validationError', () => {
    it('should return a 400 response with validation details', () => {
      const errors = ['Email is required'];
      const response = ResponseHelper.validationError(errors);
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ validationErrors: errors });
    });
  });
});
