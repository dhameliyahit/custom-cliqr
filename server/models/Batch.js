const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      required: [true, 'Batch / Group code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    totalCount: {
      type: Number,
      required: true,
      default: 0,
    },
    assignedCount: {
      type: Number,
      default: 0,
    },
    configuredCount: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('Batch', batchSchema);
