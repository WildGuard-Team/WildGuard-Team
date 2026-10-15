import mongoose from 'mongoose';
import { COMMUNITY_MEMBER, USER_ROLES } from '../config/auth.constants.js';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254,
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: USER_ROLES, default: COMMUNITY_MEMBER },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
