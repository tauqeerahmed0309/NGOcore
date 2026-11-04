const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/env');
const logger = require('../utils/logger');

let client;

const summarizeMetrics = async (recordType, metrics) => {
  if (!config.ANTHROPIC_API_KEY) return null;

  try {
    client ||= new Anthropic({ apiKey: config.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 12000 });
    const response = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 180,
      temperature: 0.2,
      system: 'You summarize NGO operations metrics. Use only the provided aggregated numbers. Do not infer causes or invent facts. Write 2-4 concise plain-language sentences and note meaningful limitations.',
      messages: [{
        role: 'user',
        content: `Summarize this six-month ${recordType} report for an NGO administrator:\n${JSON.stringify(metrics)}`
      }]
    });
    return response.content.find((block) => block.type === 'text')?.text?.trim() || null;
  } catch (error) {
    logger.warn(`AI metrics summary unavailable: ${error.message}`);
    return null;
  }
};

const setClientForTesting = (testClient) => {
  if (config.NODE_ENV === 'production') {
    throw new Error('Test AI clients cannot be configured in production.');
  }
  client = testClient;
};

module.exports = { summarizeMetrics, setClientForTesting };
