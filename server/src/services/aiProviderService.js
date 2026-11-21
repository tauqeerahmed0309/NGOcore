const config = require('../config/env');
const logger = require('../utils/logger');
const geminiService = require('./geminiService');
const anthropicSummaryService = require('./aiSummaryService');

const resolveActiveProvider = () => {
  const preferred = (config.AI_PROVIDER || 'auto').toLowerCase();
  if (preferred === 'gemini' && config.GEMINI_ENABLED && config.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (preferred === 'anthropic' && config.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (preferred === 'none') {
    return 'none';
  }

  // Auto mode: Prefer Gemini if enabled and configured, otherwise Claude Haiku
  if (config.GEMINI_ENABLED && config.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (config.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  return 'none';
};

const getProviderStatus = () => {
  const active = resolveActiveProvider();
  return {
    activeProvider: active,
    configuredProviders: [
      ...(config.GEMINI_ENABLED && config.GEMINI_API_KEY ? ['gemini'] : []),
      ...(config.ANTHROPIC_API_KEY ? ['anthropic'] : [])
    ],
    gemini: {
      enabled: Boolean(config.GEMINI_ENABLED),
      model: config.GEMINI_MODEL,
      configured: Boolean(config.GEMINI_API_KEY),
      piiMode: config.GEMINI_PII_MODE
    },
    anthropic: {
      configured: Boolean(config.ANTHROPIC_API_KEY),
      model: config.ANTHROPIC_MODEL
    }
  };
};

const summarizeMetrics = async (recordType, metrics) => {
  const provider = resolveActiveProvider();

  if (provider === 'gemini') {
    try {
      const result = await geminiService.summarizeMetrics({ recordType, metrics });
      if (result.success && result.data?.summary) {
        return result.data.summary;
      }
      logger.warn(`Gemini metric summary unavailable (${result.reason || result.error}); trying Anthropic fallback if configured.`);
    } catch (err) {
      logger.warn(`Gemini metric summary error: ${err.message}`);
    }
  }

  // Fallback or primary to Anthropic Claude if explicitly configured in environment
  if (config.ANTHROPIC_API_KEY) {
    const claudeSummary = await anthropicSummaryService.summarizeMetrics(recordType, metrics);
    if (claudeSummary) return claudeSummary;
  }

  // Deterministic rule-based summary fallback
  const total = metrics?.totalRecords ?? 0;
  return `Operational summary for ${recordType}: ${total} total records tracked across organizational programs. Ongoing audit and verification recommended for database integrity.`;
};

module.exports = {
  resolveActiveProvider,
  getProviderStatus,
  summarizeMetrics,
  explainFinding: geminiService.explainFinding,
  explainDuplicate: geminiService.explainDuplicate,
  suggestNormalization: geminiService.suggestNormalization,
  proposeCorrection: geminiService.proposeCorrection
};

