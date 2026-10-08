import {
    registerRanger,
  } from '../services/register-ranger.service.js';
  
  import {
    validateRangerRegistration,
  } from '../validation/register-ranger.validation.js';
  
  export function createRegisterRangerController(users) {
    return async function registerRangerAccount(req, res) {
        const input = validateRangerRegistration(req.body);
  
      const user = await registerRanger(
        input,
        users,
      );
  
      res.status(201).json({
        user,
        message:
          'Ranger registration submitted. Your account is waiting for Park Manager approval.',
      });
    };
  }