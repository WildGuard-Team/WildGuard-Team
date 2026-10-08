import mongoose from 'mongoose';

import {
  COMMUNITY_MEMBER,
  USER_ROLES,
  APPROVED,
  APPROVAL_STATUSES,
} from '../config/auth.constants.js';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
  },

  passwordHash: {
    type: String,
    required: true,
    select: false,
  },

  role: {
    type: String,
    required: true,
    enum: USER_ROLES,
    default: COMMUNITY_MEMBER,
  },

  approvalStatus: {
    type: String,
    required: true,
    enum: APPROVAL_STATUSES,
    default: APPROVED,
  },

  rangerId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 50,
  },

  assignedPark: {
    type: String,
    trim: true,
    maxlength: 100,
  },
}, {
  timestamps: true,
});

export const User =
  mongoose.models.User ||
  mongoose.model('User', userSchema);