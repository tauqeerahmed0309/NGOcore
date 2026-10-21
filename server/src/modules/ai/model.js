const mongoose = require('mongoose');

const aiJobSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  type: { 
    type: String, 
    enum: ['cleaning', 'analysis', 'prediction', 'deduplication', 'anomalies', 'vulnerability', 'demand_forecast'], 
    required: true 
  },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  recordTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecordType' },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiResult' },
  error: { type: String }
}, { timestamps: true });

aiJobSchema.index({ ngoId: 1, createdAt: -1 });
aiJobSchema.index({ ngoId: 1, type: 1 });

const aiResultSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiJob' },
  type: { 
    type: String, 
    enum: ['cleaning', 'analysis', 'prediction', 'deduplication', 'anomalies', 'vulnerability', 'demand_forecast'], 
    default: 'cleaning' 
  },
  summary: { type: String },
  insights: { type: mongoose.Schema.Types.Mixed },
  data: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

aiResultSchema.index({ ngoId: 1, createdAt: -1 });
aiResultSchema.index({ ngoId: 1, type: 1 });

module.exports = { 
  AiJob: mongoose.model('AiJob', aiJobSchema),
  AiResult: mongoose.model('AiResult', aiResultSchema)
};
