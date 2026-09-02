const mongoose = require('mongoose');

const qrLinkSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'QR code identifier is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    batchCode: {
      type: String,
      required: [true, 'Batch code is required'],
      index: true,
      trim: true,
      uppercase: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
    },
    redirectUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['unassigned', 'assigned', 'configured', 'inactive'],
      default: 'unassigned',
      index: true,
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying & filtering
qrLinkSchema.index({ createdAt: -1 });
qrLinkSchema.index({ assignedTo: 1, status: 1 });
qrLinkSchema.index({ batchCode: 1, status: 1 });

module.exports = mongoose.model('QrLink', qrLinkSchema);
