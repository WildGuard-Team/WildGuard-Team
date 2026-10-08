import mongoose from 'mongoose';

import {
  APPROVED,
  REJECTED,
  PENDING,
} from '../config/auth.constants.js';

import {
  HttpError,
} from '../../../shared/http-error.js';

const ALLOWED_STATUSES = [
  APPROVED,
  REJECTED,
];

export async function updateRangerApproval(
  userId,
  status,
  users,
) {
  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw new HttpError(
      400,
      'Invalid Ranger account ID.',
    );
  }

  const normalizedStatus =
    typeof status === 'string'
      ? status.trim().toUpperCase()
      : '';

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    throw new HttpError(
      400,
      'Status must be APPROVED or REJECTED.',
    );
  }

  const ranger =
    await users.findRangerById(userId);

  if (!ranger) {
    throw new HttpError(
      404,
      'Ranger account not found.',
    );
  }

  if (ranger.approvalStatus !== PENDING) {
    throw new HttpError(
      409,
      'This Ranger registration has already been reviewed.',
    );
  }

  const updatedRanger =
    await users.updateRangerApprovalStatus(
      userId,
      normalizedStatus,
    );

  return {
    id: updatedRanger.id,
    fullName: updatedRanger.fullName,
    email: updatedRanger.email,
    rangerId: updatedRanger.rangerId,
    assignedPark: updatedRanger.assignedPark,
    approvalStatus: updatedRanger.approvalStatus,
  };
}