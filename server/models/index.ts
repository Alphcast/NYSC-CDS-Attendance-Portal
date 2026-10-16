import mongoose, { Schema, Document } from 'mongoose';
import { IAttendance, IMeeting, IUser, IAuditLog, INotification } from '../types.js';

// User Schema
export interface IUserDocument extends Document, Omit<IUser, 'id'> {}

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    role: { type: String, enum: ['member', 'officer', 'admin'], default: 'member' },
    cdsGroup: { type: String, required: true },
    phoneNumber: { type: String, default: '' },
    batch: { type: String, default: '2024 Batch B' },
    ppa: { type: String, default: '' },
    isVerified: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Attendance Schema with unique compound index on stateCode + meetingDate + cdsGroup
export interface IAttendanceDocument extends Document, Omit<IAttendance, 'id'> {}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, uppercase: true, trim: true },
    cdsGroup: { type: String, required: true },
    meetingDate: { type: String, required: true },
    meetingId: { type: String },
    checkInTime: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    approvedBy: {
      officerId: { type: String },
      fullName: { type: String },
      stateCode: { type: String },
      role: { type: String }
    },
    approvalTimestamp: { type: String, default: null },
    meetingNotes: { type: String, default: '' },
    rejectionReason: { type: String, default: null },
    rejectedBy: {
      officerId: { type: String },
      fullName: { type: String }
    },
    rejectionTimestamp: { type: String, default: null }
  },
  { timestamps: true }
);

// Compound Unique Index to prevent duplicate check-ins at database level
AttendanceSchema.index({ stateCode: 1, meetingDate: 1, cdsGroup: 1 }, { unique: true });

// Meeting Schema
export interface IMeetingDocument extends Document, Omit<IMeeting, 'id'> {}

const MeetingSchema = new Schema<IMeetingDocument>(
  {
    title: { type: String, required: true },
    cdsGroup: { type: String, required: true, default: 'All' },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    venue: { type: String, required: true },
    agenda: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Audit Log Schema
export interface IAuditLogDocument extends Document, Omit<IAuditLog, 'id'> {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    action: { type: String, required: true },
    performedBy: {
      id: { type: String, required: true },
      fullName: { type: String, required: true },
      role: { type: String, required: true },
      stateCode: { type: String }
    },
    targetMember: {
      fullName: { type: String },
      stateCode: { type: String }
    },
    details: { type: String, required: true },
    meetingDate: { type: String },
    cdsGroup: { type: String },
    timestamp: { type: String, required: true }
  },
  { timestamps: true }
);

// Notification Schema
export interface INotificationDocument extends Document, Omit<INotification, 'id'> {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: String },
    stateCode: { type: String, required: true, uppercase: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Export Mongoose Models
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
export const AttendanceModel = mongoose.models.Attendance || mongoose.model<IAttendanceDocument>('Attendance', AttendanceSchema);
export const MeetingModel = mongoose.models.Meeting || mongoose.model<IMeetingDocument>('Meeting', MeetingSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);
