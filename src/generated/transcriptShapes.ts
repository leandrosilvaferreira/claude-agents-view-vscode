/**
 * AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, not a runtime contract, do not hand-edit, do not import from runtime parsing code.
 *
 * Generated: 2026-09-22T00:31:59.851Z
 * CLI versions observed: "2.1.215", "2.1.218", "2.1.219", "2.1.220", "2.1.221", "2.1.222", "2.1.223", "2.1.224", "2.1.226", "2.1.227", "2.1.228", "2.1.229", "2.1.231", "2.1.232", "2.1.233", "2.1.234", "2.1.235", "2.1.237", "2.1.238", "2.1.239", "2.1.240", "2.1.241", "2.1.245", "2.1.246", "2.1.247", "2.1.250", "2.1.251", "2.1.252", "2.1.257", "2.1.258", "2.1.259", "2.1.260", "2.1.261", "2.1.263", "2.1.266", "2.1.267", "2.1.269", "2.1.270", "2.1.272", "2.1.275", "2.1.276", "2.1.278"
 *
 * Rendered from scripts/schema-gen/schema-observations.json by generateTsReference.ts (T9,
 * see transcript-schema-gen.md). Each interface below is one observed transcript `type` (or
 * `type:subtype`) bucket; each property is the exact dotted field path recorded by
 * schemaAggregator.ts (`[]` marks a collapsed array segment), typed as the union of JS
 * `typeof` values actually observed. A trailing `?` plus a presence-count comment means the
 * field was not present on every sampled line of that bucket.
 */

/**
 * Transcript type `"agent-name"`. Observed 19429 time(s), CLI "(unknown)".
 */
export interface AgentName {
  agentName: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"ai-title"`. Observed 48671 time(s), CLI "(unknown)".
 */
export interface AiTitle {
  aiTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"artifact-autoreact-ledger"`. Observed 130 time(s), CLI "(unknown)".
 */
export interface ArtifactAutoreactLedger {
  accountUuid: string;
  artifacts: object;
  'artifacts.[dynamic-key]': object;
  sessionId: string;
  type: string;
  v: number;
}

/**
 * Transcript type `"artifact-comment-monitor"`. Observed 31 time(s), CLI "(unknown)".
 */
export interface ArtifactCommentMonitor {
  artifacts: object;
  'artifacts.[dynamic-key]': object;
  sessionId: string;
  type: string;
  v: number;
}

/**
 * Transcript type `"assistant"`. Observed 1057082 time(s), CLI "2.1.215–2.1.278".
 */
export interface Assistant {
  advisorModel?: string; // present in 8193/1057082 samples
  agentId?: string; // present in 748471/1057082 samples
  apiBlockIndex?: number; // present in 234454/1057082 samples
  apiError?: string; // present in 2/1057082 samples
  apiErrorStatus?: number; // present in 105/1057082 samples
  attributionAgent?: string; // present in 741101/1057082 samples
  attributionMcpServer?: string; // present in 26194/1057082 samples
  attributionMcpTool?: string; // present in 26194/1057082 samples
  attributionPlugin?: string; // present in 168905/1057082 samples
  attributionSkill?: string; // present in 337121/1057082 samples
  cwd: string;
  effort?: string; // present in 999031/1057082 samples
  entrypoint: string;
  error?: string; // present in 173/1057082 samples
  errorDetails?: string; // present in 2/1057082 samples
  gitBranch: string;
  isAbortedMidStream?: boolean; // present in 38/1057082 samples
  isApiErrorMessage?: boolean; // present in 212/1057082 samples
  isSidechain: boolean;
  message: object;
  'message.container'?: object; // present in 121057/1057082 samples
  'message.content': object;
  'message.content.[]': object;
  'message.content.[].caller'?: object; // present in 583598/1057082 samples
  'message.content.[].caller.type'?: string; // present in 583598/1057082 samples
  'message.content.[].citations'?: object; // present in 1/1057082 samples
  'message.content.[].id'?: string; // present in 583598/1057082 samples
  'message.content.[].input'?: object; // present in 583598/1057082 samples
  'message.content.[].input.[dynamic-key]'?: boolean | number | object | string; // present in 17034/1057082 samples
  'message.content.[].input.__unparsedToolInput'?: object; // present in 92/1057082 samples
  'message.content.[].input.action'?: string; // present in 240/1057082 samples
  'message.content.[].input.allowed_domains'?: object; // present in 5/1057082 samples
  'message.content.[].input.args'?: string; // present in 1088/1057082 samples
  'message.content.[].input.block'?: boolean | string; // present in 163/1057082 samples
  'message.content.[].input.command'?: string; // present in 319212/1057082 samples
  'message.content.[].input.content'?: string; // present in 14516/1057082 samples
  'message.content.[].input.context'?: number; // present in 2/1057082 samples
  'message.content.[].input.dangerouslyDisableSandbox'?: boolean; // present in 93/1057082 samples
  'message.content.[].input.delaySeconds'?: number; // present in 216/1057082 samples
  'message.content.[].input.description'?: string; // present in 294530/1057082 samples
  'message.content.[].input.discard_changes'?: boolean; // present in 29/1057082 samples
  'message.content.[].input.favicon'?: string; // present in 29/1057082 samples
  'message.content.[].input.file_path'?: string; // present in 209598/1057082 samples
  'message.content.[].input.findings'?: object; // present in 1827/1057082 samples
  'message.content.[].input.glob'?: string; // present in 498/1057082 samples
  'message.content.[].input.head_limit'?: number | string; // present in 1280/1057082 samples
  'message.content.[].input.id'?: string; // present in 1/1057082 samples
  'message.content.[].input.isolation'?: string; // present in 5/1057082 samples
  'message.content.[].input.label'?: string; // present in 11/1057082 samples
  'message.content.[].input.level'?: object | string; // present in 30/1057082 samples
  'message.content.[].input.limit'?: number; // present in 31301/1057082 samples
  'message.content.[].input.max_results'?: number; // present in 4730/1057082 samples
  'message.content.[].input.message'?: string; // present in 2308/1057082 samples
  'message.content.[].input.model'?: string; // present in 12027/1057082 samples
  'message.content.[].input.multiline'?: boolean; // present in 14/1057082 samples
  'message.content.[].input.name'?: string; // present in 7006/1057082 samples
  'message.content.[].input.new_new_string_PLACEHOLDER'?: string; // present in 3/1057082 samples
  'message.content.[].input.new_new_string_placeholder'?: string; // present in 3/1057082 samples
  'message.content.[].input.new_string'?: string; // present in 47398/1057082 samples
  'message.content.[].input.noop'?: boolean; // present in 144/1057082 samples
  'message.content.[].input.note'?: string; // present in 1/1057082 samples
  'message.content.[].input.offset'?: number | object; // present in 27133/1057082 samples
  'message.content.[].input.old_string'?: string; // present in 47403/1057082 samples
  'message.content.[].input.old_string_is_regex'?: string; // present in 1/1057082 samples
  'message.content.[].input.output_mode'?: string; // present in 8256/1057082 samples
  'message.content.[].input.parameter2'?: string; // present in 2/1057082 samples
  'message.content.[].input.path'?: string; // present in 6720/1057082 samples
  'message.content.[].input.pattern'?: string; // present in 9818/1057082 samples
  'message.content.[].input.persistent'?: boolean; // present in 326/1057082 samples
  'message.content.[].input.prompt'?: string; // present in 14733/1057082 samples
  'message.content.[].input.query'?: string; // present in 6664/1057082 samples
  'message.content.[].input.questions'?: object; // present in 1844/1057082 samples
  'message.content.[].input.reason'?: string; // present in 216/1057082 samples
  'message.content.[].input.recipient'?: string; // present in 2297/1057082 samples
  'message.content.[].input.refuted'?: object; // present in 5/1057082 samples
  'message.content.[].input.replace_all'?: boolean | string; // present in 47381/1057082 samples
  'message.content.[].input.run_in_background'?: boolean; // present in 12060/1057082 samples
  'message.content.[].input.skill'?: string; // present in 2488/1057082 samples
  'message.content.[].input.status'?: string; // present in 11/1057082 samples
  'message.content.[].input.stop'?: boolean; // present in 76/1057082 samples
  'message.content.[].input.subagent_type'?: string; // present in 13242/1057082 samples
  'message.content.[].input.summary'?: string; // present in 2275/1057082 samples
  'message.content.[].input.survived'?: object; // present in 5/1057082 samples
  'message.content.[].input.task_id'?: string; // present in 375/1057082 samples
  'message.content.[].input.timeout'?: number | string; // present in 28644/1057082 samples
  'message.content.[].input.timeout_ms'?: number | string; // present in 349/1057082 samples
  'message.content.[].input.to'?: string; // present in 2302/1057082 samples
  'message.content.[].input.type'?: string; // present in 2305/1057082 samples
  'message.content.[].input.url'?: string; // present in 1213/1057082 samples
  'message.content.[].name'?: string; // present in 583598/1057082 samples
  'message.content.[].signature'?: string; // present in 330813/1057082 samples
  'message.content.[].text'?: string; // present in 142745/1057082 samples
  'message.content.[].thinking'?: string; // present in 330813/1057082 samples
  'message.content.[].type': string;
  'message.context_management'?: object; // present in 121125/1057082 samples
  'message.context_management.applied_edits'?: object; // present in 100/1057082 samples
  'message.diagnostics'?: object; // present in 1057001/1057082 samples
  'message.diagnostics.cache_miss_reason'?: object; // present in 12555/1057082 samples
  'message.diagnostics.cache_miss_reason.cache_missed_input_tokens'?: number; // present in 9912/1057082 samples
  'message.diagnostics.cache_miss_reason.type'?: string; // present in 12555/1057082 samples
  'message.id': string;
  'message.input_transformations'?: object; // present in 23038/1057082 samples
  'message.input_transformations.[]'?: object; // present in 191/1057082 samples
  'message.input_transformations.[].path'?: string; // present in 191/1057082 samples
  'message.input_transformations.[].reason'?: string; // present in 191/1057082 samples
  'message.input_transformations.[].type'?: string; // present in 191/1057082 samples
  'message.model': string;
  'message.role': string;
  'message.stop_details': object;
  'message.stop_reason': object | string;
  'message.stop_sequence': object | string;
  'message.type': string;
  'message.usage': object;
  'message.usage.cache_creation': object;
  'message.usage.cache_creation.ephemeral_1h_input_tokens': number;
  'message.usage.cache_creation.ephemeral_5m_input_tokens': number;
  'message.usage.cache_creation_input_tokens': number;
  'message.usage.cache_read_input_tokens': number;
  'message.usage.inference_geo': object | string;
  'message.usage.input_tokens': number;
  'message.usage.iterations'?: object; // present in 578638/1057082 samples
  'message.usage.iterations.[]'?: object; // present in 578361/1057082 samples
  'message.usage.iterations.[].cache_creation'?: object; // present in 578361/1057082 samples
  'message.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 578361/1057082 samples
  'message.usage.iterations.[].cache_read_input_tokens'?: number; // present in 578361/1057082 samples
  'message.usage.iterations.[].input_tokens'?: number; // present in 578361/1057082 samples
  'message.usage.iterations.[].output_tokens'?: number; // present in 578361/1057082 samples
  'message.usage.iterations.[].type'?: string; // present in 578361/1057082 samples
  'message.usage.output_tokens': number;
  'message.usage.output_tokens_details'?: object; // present in 386059/1057082 samples
  'message.usage.output_tokens_details.thinking_tokens'?: number; // present in 385928/1057082 samples
  'message.usage.server_tool_use'?: object; // present in 578638/1057082 samples
  'message.usage.server_tool_use.web_fetch_requests'?: number; // present in 578638/1057082 samples
  'message.usage.server_tool_use.web_search_requests'?: number; // present in 578638/1057082 samples
  'message.usage.service_tier': object | string;
  'message.usage.speed'?: object | string; // present in 578638/1057082 samples
  parentUuid: string;
  perTurnEffort?: object | string; // present in 77845/1057082 samples
  quotaLimits?: object; // present in 36/1057082 samples
  'quotaLimits.isUsingOverage'?: boolean; // present in 36/1057082 samples
  'quotaLimits.overageDisabledReason'?: string; // present in 36/1057082 samples
  'quotaLimits.overageStatus'?: string; // present in 36/1057082 samples
  'quotaLimits.rateLimitType'?: string; // present in 36/1057082 samples
  'quotaLimits.resetsAt'?: number; // present in 36/1057082 samples
  'quotaLimits.status'?: string; // present in 36/1057082 samples
  'quotaLimits.unifiedRateLimitFallbackAvailable'?: boolean; // present in 36/1057082 samples
  requestId?: string; // present in 1056974/1057082 samples
  sessionId: string;
  session_id?: string; // present in 946/1057082 samples
  slug?: string; // present in 129241/1057082 samples
  supersedesUuids?: object; // present in 3/1057082 samples
  'supersedesUuids.[]'?: string; // present in 3/1057082 samples
  timestamp: string;
  truncatedAfterOutput?: boolean; // present in 4/1057082 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
  wireIngestContext?: object; // present in 7673/1057082 samples
  'wireIngestContext.[dynamic-key]'?: object; // present in 7673/1057082 samples
  wireToolInputs?: object; // present in 26980/1057082 samples
  'wireToolInputs.[dynamic-key]'?: object; // present in 26980/1057082 samples
}

/**
 * Transcript type `"atis-latch"`. Observed 28084 time(s), CLI "(unknown)".
 */
export interface AtisLatch {
  atis: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"attachment"`. Observed 1324638 time(s), CLI "2.1.215–2.1.278".
 */
export interface Attachment {
  agentId?: string; // present in 589394/1324638 samples
  attachment: object;
  'attachment.addedBlocks'?: object; // present in 3653/1324638 samples
  'attachment.addedBlocks.[]'?: string; // present in 3614/1324638 samples
  'attachment.addedLines'?: object; // present in 24581/1324638 samples
  'attachment.addedLines.[]'?: string; // present in 22132/1324638 samples
  'attachment.addedNames'?: object; // present in 21920/1324638 samples
  'attachment.addedNames.[]'?: string; // present in 19480/1324638 samples
  'attachment.addedTypes'?: object; // present in 6314/1324638 samples
  'attachment.addedTypes.[]'?: string; // present in 6298/1324638 samples
  'attachment.allowedTools'?: object; // present in 2699/1324638 samples
  'attachment.allowedTools.[]'?: string; // present in 205/1324638 samples
  'attachment.autoModeConsentFlow'?: boolean; // present in 1977/1324638 samples
  'attachment.banner'?: string; // present in 745/1324638 samples
  'attachment.bashFirst'?: boolean; // present in 1977/1324638 samples
  'attachment.bashFirstSteer'?: string; // present in 1454/1324638 samples
  'attachment.blockHashes'?: object; // present in 2/1324638 samples
  'attachment.blockHashes.[]'?: string; // present in 2/1324638 samples
  'attachment.blockingError'?: object; // present in 2217/1324638 samples
  'attachment.blockingError.blockingError'?: string; // present in 2217/1324638 samples
  'attachment.blockingError.command'?: string; // present in 2217/1324638 samples
  'attachment.bypass'?: boolean; // present in 1977/1324638 samples
  'attachment.changed'?: boolean; // present in 75/1324638 samples
  'attachment.changes'?: object; // present in 89/1324638 samples
  'attachment.changes.[]'?: object; // present in 89/1324638 samples
  'attachment.changes.[].field'?: string; // present in 89/1324638 samples
  'attachment.changes.[].from'?: string; // present in 89/1324638 samples
  'attachment.clearAt'?: string; // present in 53/1324638 samples
  'attachment.cliPrefix'?: string; // present in 1182/1324638 samples
  'attachment.clientChange'?: object; // present in 2/1324638 samples
  'attachment.clientChange.baseline'?: string; // present in 2/1324638 samples
  'attachment.clientChange.callNumber'?: number; // present in 2/1324638 samples
  'attachment.clientChange.firstChangedMessageIndex'?: number; // present in 2/1324638 samples
  'attachment.clientChange.kinds'?: string; // present in 2/1324638 samples
  'attachment.command'?: string; // present in 942368/1324638 samples
  'attachment.commandMode'?: string; // present in 6464/1324638 samples
  'attachment.commit'?: string; // present in 1203/1324638 samples
  'attachment.condition'?: string; // present in 496/1324638 samples
  'attachment.content'?: object | string; // present in 1099508/1324638 samples
  'attachment.content.[]'?: object | string; // present in 106368/1324638 samples
  'attachment.content.[].activeForm'?: string; // present in 3008/1324638 samples
  'attachment.content.[].content'?: string; // present in 3008/1324638 samples
  'attachment.content.[].status'?: string; // present in 3008/1324638 samples
  'attachment.content.content'?: string; // present in 28496/1324638 samples
  'attachment.content.contentDiffersFromDisk'?: boolean; // present in 28496/1324638 samples
  'attachment.content.file'?: object; // present in 306/1324638 samples
  'attachment.content.file.content'?: string; // present in 305/1324638 samples
  'attachment.content.file.filePath'?: string; // present in 306/1324638 samples
  'attachment.content.file.numLines'?: number; // present in 305/1324638 samples
  'attachment.content.file.startLine'?: number; // present in 305/1324638 samples
  'attachment.content.file.totalLines'?: number; // present in 305/1324638 samples
  'attachment.content.globs'?: object; // present in 23085/1324638 samples
  'attachment.content.globs.[]'?: string; // present in 23085/1324638 samples
  'attachment.content.parent'?: string; // present in 79/1324638 samples
  'attachment.content.path'?: string; // present in 28496/1324638 samples
  'attachment.content.rawContent'?: string; // present in 23598/1324638 samples
  'attachment.content.type'?: string; // present in 28802/1324638 samples
  'attachment.context'?: object; // present in 1507/1324638 samples
  'attachment.context.gitStatus'?: string; // present in 1365/1324638 samples
  'attachment.context.userEmail'?: string; // present in 1458/1324638 samples
  'attachment.data'?: object; // present in 1734/1324638 samples
  'attachment.data.findings'?: object; // present in 1729/1324638 samples
  'attachment.data.findings.[]'?: object; // present in 40/1324638 samples
  'attachment.data.findings.[].category'?: string; // present in 40/1324638 samples
  'attachment.data.findings.[].confidence'?: number; // present in 31/1324638 samples
  'attachment.data.findings.[].explanation'?: string; // present in 40/1324638 samples
  'attachment.data.findings.[].filePath'?: string; // present in 40/1324638 samples
  'attachment.data.findings.[].fix'?: string; // present in 40/1324638 samples
  'attachment.data.findings.[].severity'?: string; // present in 40/1324638 samples
  'attachment.data.findings.[].vulnerableCode'?: string; // present in 40/1324638 samples
  'attachment.data.refuted'?: object; // present in 5/1324638 samples
  'attachment.data.survived'?: object; // present in 5/1324638 samples
  'attachment.data.survived.[]'?: number; // present in 5/1324638 samples
  'attachment.date'?: string; // present in 1749/1324638 samples
  'attachment.deltaSummary'?: object; // present in 30/1324638 samples
  'attachment.description'?: string; // present in 30/1324638 samples
  'attachment.displayPath'?: string; // present in 28903/1324638 samples
  'attachment.durationMs'?: number; // present in 942448/1324638 samples
  'attachment.entries'?: object; // present in 651/1324638 samples
  'attachment.entries.[]'?: object; // present in 491/1324638 samples
  'attachment.entries.[].defer_loading'?: boolean; // present in 491/1324638 samples
  'attachment.entries.[].description'?: string; // present in 491/1324638 samples
  'attachment.entries.[].eager_input_streaming'?: boolean; // present in 491/1324638 samples
  'attachment.entries.[].input_schema'?: object; // present in 491/1324638 samples
  'attachment.entries.[].input_schema.$schema'?: string; // present in 333/1324638 samples
  'attachment.entries.[].input_schema.additionalProperties'?: boolean; // present in 201/1324638 samples
  'attachment.entries.[].input_schema.properties'?: object; // present in 491/1324638 samples
  'attachment.entries.[].input_schema.required'?: object; // present in 433/1324638 samples
  'attachment.entries.[].input_schema.type'?: string; // present in 491/1324638 samples
  'attachment.entries.[].name'?: string; // present in 491/1324638 samples
  'attachment.exitCode'?: number; // present in 942194/1324638 samples
  'attachment.failedMcpServers'?: object; // present in 3220/1324638 samples
  'attachment.failedMcpServers.[]'?: object; // present in 1357/1324638 samples
  'attachment.failedMcpServers.[].error'?: string; // present in 1357/1324638 samples
  'attachment.failedMcpServers.[].errorCode'?: string; // present in 1354/1324638 samples
  'attachment.failedMcpServers.[].name'?: string; // present in 1357/1324638 samples
  'attachment.filename'?: string; // present in 1724/1324638 samples
  'attachment.files'?: object; // present in 4088/1324638 samples
  'attachment.files.[]'?: object; // present in 4088/1324638 samples
  'attachment.files.[].content'?: string; // present in 1632/1324638 samples
  'attachment.files.[].diagnostics'?: object; // present in 2456/1324638 samples
  'attachment.files.[].diagnostics.[]'?: object; // present in 2456/1324638 samples
  'attachment.files.[].path'?: string; // present in 1632/1324638 samples
  'attachment.files.[].type'?: string; // present in 1632/1324638 samples
  'attachment.files.[].uri'?: string; // present in 2456/1324638 samples
  'attachment.firstReportForThreadInProcess'?: boolean; // present in 2/1324638 samples
  'attachment.hookEvent'?: string; // present in 1050316/1324638 samples
  'attachment.hookName'?: string; // present in 1050316/1324638 samples
  'attachment.humanTurn'?: boolean; // present in 15/1324638 samples
  'attachment.ideName'?: string; // present in 3/1324638 samples
  'attachment.identity'?: object; // present in 1382/1324638 samples
  'attachment.identity.knowledgeCutoff'?: object | string; // present in 1382/1324638 samples
  'attachment.identity.marketingName'?: object | string; // present in 1382/1324638 samples
  'attachment.identity.modelId'?: string; // present in 1382/1324638 samples
  'attachment.isInitial'?: boolean; // present in 22973/1324638 samples
  'attachment.isMeta'?: boolean; // present in 256/1324638 samples
  'attachment.isNew'?: boolean; // present in 2456/1324638 samples
  'attachment.itemCount'?: number; // present in 8455/1324638 samples
  'attachment.iterations'?: number; // present in 80/1324638 samples
  'attachment.language'?: string; // present in 146/1324638 samples
  'attachment.lineEnd'?: number; // present in 3/1324638 samples
  'attachment.lineStart'?: number; // present in 3/1324638 samples
  'attachment.managedCommit'?: boolean; // present in 1027/1324638 samples
  'attachment.managedPr'?: boolean; // present in 1027/1324638 samples
  'attachment.maxTurns'?: number; // present in 220/1324638 samples
  'attachment.met'?: boolean; // present in 496/1324638 samples
  'attachment.model'?: string; // present in 3157/1324638 samples
  'attachment.nameOnlyAnnouncements'?: object; // present in 160/1324638 samples
  'attachment.nameOnlyAnnouncements.[]'?: string; // present in 160/1324638 samples
  'attachment.names'?: object; // present in 16659/1324638 samples
  'attachment.names.[]'?: string; // present in 16659/1324638 samples
  'attachment.needsAuthMcpServers'?: object; // present in 6452/1324638 samples
  'attachment.needsAuthMcpServers.[]'?: string; // present in 2517/1324638 samples
  'attachment.newDate'?: string; // present in 371/1324638 samples
  'attachment.newlyDropped'?: object; // present in 2/1324638 samples
  'attachment.newlyDropped.blockCount'?: number; // present in 2/1324638 samples
  'attachment.newlyDropped.first'?: object; // present in 2/1324638 samples
  'attachment.newlyDropped.first.blockIndex'?: number; // present in 2/1324638 samples
  'attachment.newlyDropped.first.messageIndex'?: number; // present in 2/1324638 samples
  'attachment.newlyDropped.last'?: object; // present in 2/1324638 samples
  'attachment.newlyDropped.last.blockIndex'?: number; // present in 2/1324638 samples
  'attachment.newlyDropped.last.messageIndex'?: number; // present in 2/1324638 samples
  'attachment.newlyDropped.reason'?: string; // present in 2/1324638 samples
  'attachment.newlyDropped.turnCount'?: number; // present in 2/1324638 samples
  'attachment.origin'?: object; // present in 1486/1324638 samples
  'attachment.origin.body'?: string; // present in 180/1324638 samples
  'attachment.origin.from'?: string; // present in 180/1324638 samples
  'attachment.origin.fromMode'?: string; // present in 2/1324638 samples
  'attachment.origin.hopChain'?: object; // present in 1/1324638 samples
  'attachment.origin.hopChain.[]'?: string; // present in 1/1324638 samples
  'attachment.origin.kind'?: string; // present in 1486/1324638 samples
  'attachment.origin.msg_id'?: string; // present in 2/1324638 samples
  'attachment.origin.name'?: string; // present in 180/1324638 samples
  'attachment.origin.senderTaskId'?: string; // present in 178/1324638 samples
  'attachment.origin.verifiedPeerPid'?: number; // present in 2/1324638 samples
  'attachment.outputFilePath'?: string; // present in 30/1324638 samples
  'attachment.path'?: string; // present in 28496/1324638 samples
  'attachment.pendingMcpServers'?: object; // present in 6478/1324638 samples
  'attachment.pendingMcpServers.[]'?: string; // present in 152/1324638 samples
  'attachment.pr'?: string; // present in 1203/1324638 samples
  'attachment.prompt'?: object | string; // present in 6599/1324638 samples
  'attachment.prompt.[]'?: object; // present in 1208/1324638 samples
  'attachment.prompt.[].source'?: object; // present in 40/1324638 samples
  'attachment.prompt.[].source.data'?: string; // present in 40/1324638 samples
  'attachment.prompt.[].source.media_type'?: string; // present in 40/1324638 samples
  'attachment.prompt.[].source.type'?: string; // present in 40/1324638 samples
  'attachment.prompt.[].text'?: string; // present in 1208/1324638 samples
  'attachment.prompt.[].type'?: string; // present in 1208/1324638 samples
  'attachment.querySource'?: string; // present in 2/1324638 samples
  'attachment.readdedNames'?: object; // present in 18267/1324638 samples
  'attachment.readdedNames.[]'?: string; // present in 33/1324638 samples
  'attachment.reason'?: string; // present in 416/1324638 samples
  'attachment.removed'?: object; // present in 9/1324638 samples
  'attachment.removed.[]'?: string; // present in 9/1324638 samples
  'attachment.removedNames'?: object; // present in 21920/1324638 samples
  'attachment.removedNames.[]'?: string; // present in 333/1324638 samples
  'attachment.removedTypes'?: object; // present in 6314/1324638 samples
  'attachment.removedTypes.[]'?: string; // present in 17/1324638 samples
  'attachment.requestId'?: string; // present in 2/1324638 samples
  'attachment.scope'?: string; // present in 7/1324638 samples
  'attachment.sendUserFileHint'?: boolean; // present in 1203/1324638 samples
  'attachment.sentinel'?: boolean; // present in 104/1324638 samples
  'attachment.showConcurrencyNote'?: boolean; // present in 6314/1324638 samples
  'attachment.skillCount'?: number; // present in 16659/1324638 samples
  'attachment.skillDir'?: string; // present in 48/1324638 samples
  'attachment.skillNames'?: object; // present in 48/1324638 samples
  'attachment.skillNames.[]'?: string; // present in 48/1324638 samples
  'attachment.skills'?: object; // present in 41/1324638 samples
  'attachment.skills.[]'?: object; // present in 41/1324638 samples
  'attachment.skills.[].content'?: string; // present in 41/1324638 samples
  'attachment.skills.[].name'?: string; // present in 41/1324638 samples
  'attachment.skills.[].path'?: string; // present in 41/1324638 samples
  'attachment.snapshot'?: object; // present in 1424/1324638 samples
  'attachment.snapshot.additionalWorkingDirectories'?: object; // present in 1424/1324638 samples
  'attachment.snapshot.additionalWorkingDirectories.[]'?: string; // present in 1110/1324638 samples
  'attachment.snapshot.isGitRepo'?: boolean; // present in 1424/1324638 samples
  'attachment.snapshot.isWorktree'?: boolean; // present in 1424/1324638 samples
  'attachment.snapshot.osVersion'?: string; // present in 1424/1324638 samples
  'attachment.snapshot.platform'?: string; // present in 1424/1324638 samples
  'attachment.snapshot.scratchpadDirectory'?: string; // present in 1109/1324638 samples
  'attachment.snapshot.shell'?: string; // present in 1424/1324638 samples
  'attachment.snapshot.workingDirectory'?: string; // present in 1424/1324638 samples
  'attachment.snippet'?: string; // present in 1357/1324638 samples
  'attachment.source_uuid'?: string; // present in 1522/1324638 samples
  'attachment.status'?: string; // present in 30/1324638 samples
  'attachment.stderr'?: string; // present in 942194/1324638 samples
  'attachment.stdout'?: string; // present in 942194/1324638 samples
  'attachment.steerOnly'?: boolean; // present in 1977/1324638 samples
  'attachment.style'?: object | string; // present in 35477/1324638 samples
  'attachment.style.name'?: string; // present in 147/1324638 samples
  'attachment.style.prompt'?: string; // present in 147/1324638 samples
  'attachment.surfacedNames'?: object; // present in 579/1324638 samples
  'attachment.surfacedNames.[]'?: string; // present in 579/1324638 samples
  'attachment.systemPrompt'?: object; // present in 2442/1324638 samples
  'attachment.systemPrompt.[]'?: string; // present in 2442/1324638 samples
  'attachment.taskId'?: string; // present in 30/1324638 samples
  'attachment.taskType'?: string; // present in 30/1324638 samples
  'attachment.text'?: string; // present in 127059/1324638 samples
  'attachment.thinkingBlocksSent'?: number; // present in 2/1324638 samples
  'attachment.thinkingTurnsSent'?: number; // present in 2/1324638 samples
  'attachment.timedOut'?: boolean; // present in 174/1324638 samples
  'attachment.timeoutMs'?: number; // present in 174/1324638 samples
  'attachment.timestamp'?: string; // present in 6464/1324638 samples
  'attachment.tokens'?: number; // present in 80/1324638 samples
  'attachment.toolUseID'?: string; // present in 1052834/1324638 samples
  'attachment.tools'?: object; // present in 1223/1324638 samples
  'attachment.tools.[]'?: object; // present in 1223/1324638 samples
  'attachment.tools.[].description'?: string; // present in 1223/1324638 samples
  'attachment.tools.[].name'?: string; // present in 1223/1324638 samples
  'attachment.tools.[].schema'?: object; // present in 1223/1324638 samples
  'attachment.tools.[].schema.description'?: string; // present in 1223/1324638 samples
  'attachment.tools.[].schema.eager_input_streaming'?: boolean; // present in 1223/1324638 samples
  'attachment.tools.[].schema.input_schema'?: object; // present in 1223/1324638 samples
  'attachment.tools.[].schema.name'?: string; // present in 1223/1324638 samples
  'attachment.turnCount'?: number; // present in 220/1324638 samples
  'attachment.turnReminder'?: string; // present in 35329/1324638 samples
  'attachment.type': string;
  'attachment.url'?: object; // present in 1203/1324638 samples
  'attachment.wireHiddenNames'?: object; // present in 6225/1324638 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isSidechain: boolean;
  parentUuid: object | string;
  rendered?: object; // present in 99658/1324638 samples
  'rendered.[]'?: object; // present in 99658/1324638 samples
  'rendered.[].content'?: object | string; // present in 99658/1324638 samples
  'rendered.[].content.[]'?: object; // present in 150/1324638 samples
  'rendered.[].content.[].text'?: string; // present in 150/1324638 samples
  'rendered.[].content.[].type'?: string; // present in 150/1324638 samples
  renderedInHumanTurn?: object; // present in 610/1324638 samples
  'renderedInHumanTurn.[]'?: object; // present in 610/1324638 samples
  'renderedInHumanTurn.[].content'?: string; // present in 610/1324638 samples
  sessionId: string;
  session_id?: string; // present in 2625/1324638 samples
  slug?: string; // present in 228961/1324638 samples
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"bridge-session"`. Observed 178 time(s), CLI "(unknown)".
 */
export interface BridgeSession {
  bridgeSessionId: string;
  lastSequenceNum: number;
  ownerAccountUuid?: string; // present in 2/178 samples
  ownerOrganizationUuid?: string; // present in 2/178 samples
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"cost-state"`. Observed 41 time(s), CLI "(unknown)".
 */
export interface CostState {
  hasUnknownModelCost: boolean;
  modelUsage: object;
  'modelUsage.[dynamic-key]'?: object; // present in 26/41 samples
  sessionId: string;
  startTime: number;
  totalAPIDuration: number;
  totalAPIDurationWithoutRetries: number;
  totalCostUSD: number;
  totalDuration: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  totalToolDuration: number;
  type: string;
}

/**
 * Transcript type `"custom-title"`. Observed 21259 time(s), CLI "(unknown)".
 */
export interface CustomTitle {
  customTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"file-history-delta"`. Observed 5244 time(s), CLI "(unknown)".
 */
export interface FileHistoryDelta {
  backup: object;
  'backup.backupFileName': object | string;
  'backup.backupTime': string;
  'backup.realParentDir'?: string; // present in 5238/5244 samples
  'backup.version': number;
  messageId: string;
  snapshotMessageId: string;
  timestamp: string;
  trackingPath: string;
  type: string;
}

/**
 * Transcript type `"file-history-snapshot"`. Observed 9648 time(s), CLI "(unknown)".
 */
export interface FileHistorySnapshot {
  isSnapshotUpdate: boolean;
  messageId: string;
  snapshot: object;
  'snapshot.messageId': string;
  'snapshot.preCheckpoint'?: boolean; // present in 11/9648 samples
  'snapshot.timestamp': string;
  'snapshot.trackedFileBackups': object;
  'snapshot.trackedFileBackups.[dynamic-key]'?: object; // present in 3706/9648 samples
  type: string;
}

/**
 * Transcript type `"frame-link"`. Observed 447 time(s), CLI "(unknown)".
 */
export interface FrameLink {
  artifactCount?: number; // present in 437/447 samples
  frameUrl?: string; // present in 30/447 samples
  path?: string; // present in 30/447 samples
  sessionId: string;
  timestamp: string;
  title?: string; // present in 30/447 samples
  type: string;
}

/**
 * Transcript type `"last-prompt"`. Observed 64728 time(s), CLI "(unknown)".
 */
export interface LastPrompt {
  lastPrompt?: string; // present in 62178/64728 samples
  leafUuid: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"mode"`. Observed 8269 time(s), CLI "(unknown)".
 */
export interface Mode {
  mode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"permission-mode"`. Observed 291 time(s), CLI "(unknown)".
 */
export interface PermissionMode {
  permissionMode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"pr-link"`. Observed 20159 time(s), CLI "(unknown)".
 */
export interface PrLink {
  prNumber: number;
  prRepository: string;
  prUrl: string;
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Transcript type `"queue-operation"`. Observed 52460 time(s), CLI "(unknown)".
 */
export interface QueueOperation {
  content?: string; // present in 24502/52460 samples
  operation: string;
  reason?: string; // present in 2209/52460 samples
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Transcript type `"relocated"`. Observed 7430 time(s), CLI "(unknown)".
 */
export interface Relocated {
  relocatedCwd: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"system:agents_killed"`. Observed 1 time(s), CLI "2.1.258".
 */
export interface SystemAgentsKilled {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  parentUuid: string;
  sessionId: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:api_error"`. Observed 689 time(s), CLI "2.1.218–2.1.276".
 */
export interface SystemApiError {
  cwd: string;
  entrypoint: string;
  error: object;
  'error.connection': object;
  'error.connection.code'?: string; // present in 394/689 samples
  'error.connection.isSSLError'?: boolean; // present in 394/689 samples
  'error.connection.message'?: string; // present in 394/689 samples
  'error.formatted': string;
  'error.isNetworkDown': boolean;
  'error.message': string;
  'error.noResponse'?: object; // present in 150/689 samples
  'error.noResponse.retryWaitMs'?: number; // present in 1/689 samples
  'error.noResponse.waitedMs'?: number; // present in 1/689 samples
  'error.rateLimits': object;
  'error.requestId'?: string; // present in 284/689 samples
  'error.status'?: number; // present in 285/689 samples
  gitBranch: string;
  isSidechain: boolean;
  level: string;
  maxRetries: number;
  parentUuid: string;
  retryAttempt: number;
  retryInMs: number;
  sessionId: string;
  slug?: string; // present in 70/689 samples
  source: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:away_summary"`. Observed 5 time(s), CLI "2.1.258–2.1.270".
 */
export interface SystemAwaySummary {
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  parentUuid: string;
  sessionId: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:compact_boundary"`. Observed 53 time(s), CLI "2.1.220–2.1.276".
 */
export interface SystemCompactBoundary {
  agentId?: string; // present in 7/53 samples
  compactMetadata: object;
  'compactMetadata.cumulativeDroppedTokens': number;
  'compactMetadata.durationMs': number;
  'compactMetadata.postTokens': number;
  'compactMetadata.preCompactDiscoveredTools'?: object; // present in 49/53 samples
  'compactMetadata.preCompactDiscoveredTools.[]'?: string; // present in 49/53 samples
  'compactMetadata.preTokens': number;
  'compactMetadata.preservedMessages': object;
  'compactMetadata.preservedMessages.allUuids': object;
  'compactMetadata.preservedMessages.allUuids.[]': string;
  'compactMetadata.preservedMessages.anchorUuid': string;
  'compactMetadata.preservedMessages.uuids': object;
  'compactMetadata.preservedMessages.uuids.[]': string;
  'compactMetadata.preservedSegment': object;
  'compactMetadata.preservedSegment.anchorUuid': string;
  'compactMetadata.preservedSegment.headUuid': string;
  'compactMetadata.preservedSegment.tailUuid': string;
  'compactMetadata.trigger': string;
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta?: boolean; // present in 33/53 samples
  isSidechain: boolean;
  level: string;
  logicalParentUuid: string;
  parentUuid: object;
  sessionId: string;
  slug: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:informational"`. Observed 14 time(s), CLI "2.1.223–2.1.270".
 */
export interface SystemInformational {
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
  parentUuid: object | string;
  sessionId: string;
  slug?: string; // present in 2/14 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:local_command"`. Observed 130 time(s), CLI "2.1.218–2.1.278".
 */
export interface SystemLocalCommand {
  commandRun?: object; // present in 7/130 samples
  'commandRun.args'?: string; // present in 7/130 samples
  'commandRun.command'?: string; // present in 7/130 samples
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  sessionId: string;
  slug?: string; // present in 12/130 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:model_refusal_fallback"`. Observed 11 time(s), CLI "2.1.261–2.1.263".
 */
export interface SystemModelRefusalFallback {
  apiRefusalCategory: string;
  apiRefusalExplanation: string;
  content: string;
  cwd: string;
  direction: string;
  entrypoint: string;
  fallbackModel: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
  originalModel: string;
  parentUuid: string;
  refusedUserMessageUuid: string;
  requestId: string;
  retractedMessageUuids: object;
  'retractedMessageUuids.[]'?: string; // present in 3/11 samples
  scope: string;
  sessionId: string;
  subtype: string;
  timestamp: string;
  trigger: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:stop_hook_summary"`. Observed 15692 time(s), CLI "2.1.215–2.1.278".
 */
export interface SystemStopHookSummary {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  hasOutput: boolean;
  hookAdditionalContext: object;
  hookCount: number;
  hookErrors: object;
  'hookErrors.[]'?: string; // present in 639/15692 samples
  hookInfos: object;
  'hookInfos.[]': object;
  'hookInfos.[].command': string;
  'hookInfos.[].durationMs': number;
  'hookInfos.[].promptText'?: string; // present in 319/15692 samples
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  preventedContinuation: boolean;
  sessionId: string;
  session_id?: string; // present in 84/15692 samples
  slug?: string; // present in 2845/15692 samples
  stopReason: string;
  subtype: string;
  timestamp: string;
  toolUseID: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:turn_duration"`. Observed 52 time(s), CLI "2.1.220–2.1.270".
 */
export interface SystemTurnDuration {
  cwd: string;
  durationMs: number;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  messageCount: number;
  parentUuid: string;
  pendingBackgroundAgentCount?: number; // present in 9/52 samples
  sessionId: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"user"`. Observed 630823 time(s), CLI "2.1.215–2.1.278".
 */
export interface User {
  agentId?: string; // present in 442961/630823 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  imagePasteIds?: object; // present in 8/630823 samples
  'imagePasteIds.[]'?: number; // present in 8/630823 samples
  interruptedByShutdown?: boolean; // present in 709/630823 samples
  isCompactSummary?: boolean; // present in 53/630823 samples
  isMeta?: boolean; // present in 13432/630823 samples
  isSidechain: boolean;
  isVisibleInTranscriptOnly?: boolean; // present in 53/630823 samples
  mcpMeta?: object; // present in 3911/630823 samples
  'mcpMeta._meta'?: object; // present in 984/630823 samples
  'mcpMeta._meta.[dynamic-key]'?: object; // present in 984/630823 samples
  'mcpMeta.structuredContent'?: object; // present in 2927/630823 samples
  'mcpMeta.structuredContent.[dynamic-key]'?: boolean | number | object | string; // present in 25454/630823 samples
  message: object;
  'message.content': object | string;
  'message.content.[]'?: object; // present in 593901/630823 samples
  'message.content.[].content'?: object | string; // present in 583952/630823 samples
  'message.content.[].content.[]'?: object; // present in 23738/630823 samples
  'message.content.[].is_error'?: boolean; // present in 325394/630823 samples
  'message.content.[].source'?: object; // present in 203/630823 samples
  'message.content.[].source.data'?: string; // present in 203/630823 samples
  'message.content.[].source.media_type'?: string; // present in 203/630823 samples
  'message.content.[].source.type'?: string; // present in 203/630823 samples
  'message.content.[].text'?: string; // present in 9949/630823 samples
  'message.content.[].title'?: string; // present in 9/630823 samples
  'message.content.[].tool_use_id'?: string; // present in 583952/630823 samples
  'message.content.[].type'?: string; // present in 593901/630823 samples
  'message.role': string;
  origin?: object; // present in 16639/630823 samples
  'origin.body'?: string; // present in 544/630823 samples
  'origin.from'?: string; // present in 544/630823 samples
  'origin.fromMode'?: string; // present in 1/630823 samples
  'origin.kind'?: string; // present in 16639/630823 samples
  'origin.msg_id'?: string; // present in 1/630823 samples
  'origin.name'?: string; // present in 544/630823 samples
  'origin.senderTaskId'?: string; // present in 543/630823 samples
  'origin.verifiedPeerPid'?: number; // present in 1/630823 samples
  parentUuid: object | string;
  permissionMode?: string; // present in 18439/630823 samples
  promptId?: string; // present in 630739/630823 samples
  promptSource?: string; // present in 18441/630823 samples
  queuePriority?: string; // present in 1/630823 samples
  queueSkipAttachments?: boolean; // present in 3650/630823 samples
  sessionId: string;
  session_id?: string; // present in 480/630823 samples
  slug?: string; // present in 76377/630823 samples
  sourceToolAssistantUUID?: string; // present in 583952/630823 samples
  sourceToolUseID?: string; // present in 2536/630823 samples
  timestamp: string;
  toolDenialKind?: string; // present in 2526/630823 samples
  toolEndsTurn?: boolean; // present in 1734/630823 samples
  toolUseResult?: object | string; // present in 178768/630823 samples
  'toolUseResult.[]'?: object; // present in 1376/630823 samples
  'toolUseResult.[].text'?: string; // present in 1376/630823 samples
  'toolUseResult.[].type'?: string; // present in 1376/630823 samples
  'toolUseResult.action'?: string; // present in 202/630823 samples
  'toolUseResult.agentId'?: string; // present in 12407/630823 samples
  'toolUseResult.agentType'?: string; // present in 4329/630823 samples
  'toolUseResult.agent_id'?: string; // present in 5/630823 samples
  'toolUseResult.agent_type'?: string; // present in 5/630823 samples
  'toolUseResult.allowedTools'?: object; // present in 55/630823 samples
  'toolUseResult.allowedTools.[]'?: string; // present in 55/630823 samples
  'toolUseResult.answers'?: object; // present in 1804/630823 samples
  'toolUseResult.answers.[dynamic-key]'?: string; // present in 1804/630823 samples
  'toolUseResult.appliedLimit'?: number; // present in 547/630823 samples
  'toolUseResult.artifact_id'?: string; // present in 20/630823 samples
  'toolUseResult.artifacts'?: object; // present in 2/630823 samples
  'toolUseResult.artifacts.[]'?: object; // present in 2/630823 samples
  'toolUseResult.artifacts.[].[dynamic-key]'?: string; // present in 6/630823 samples
  'toolUseResult.audience'?: string; // present in 8/630823 samples
  'toolUseResult.backgroundCwdHint'?: string; // present in 167/630823 samples
  'toolUseResult.backgroundTaskId'?: string; // present in 3387/630823 samples
  'toolUseResult.bashEditDiff'?: object; // present in 215/630823 samples
  'toolUseResult.bashEditDiff.changedFiles'?: object; // present in 126/630823 samples
  'toolUseResult.bashEditDiff.changedFiles.[]'?: string; // present in 126/630823 samples
  'toolUseResult.bashEditDiff.files'?: object; // present in 215/630823 samples
  'toolUseResult.bashEditDiff.files.[]'?: object; // present in 113/630823 samples
  'toolUseResult.bashEditDiff.files.[].created'?: boolean; // present in 37/630823 samples
  'toolUseResult.bashEditDiff.files.[].deleted'?: boolean; // present in 16/630823 samples
  'toolUseResult.bashEditDiff.files.[].filePath'?: string; // present in 113/630823 samples
  'toolUseResult.bashEditDiff.files.[].hunks'?: object; // present in 113/630823 samples
  'toolUseResult.bashEditDiff.moreFiles'?: number; // present in 215/630823 samples
  'toolUseResult.bashEditDiff.shared'?: boolean; // present in 42/630823 samples
  'toolUseResult.bashEditDiff.unavailable'?: boolean; // present in 53/630823 samples
  'toolUseResult.bytes'?: number; // present in 150/630823 samples
  'toolUseResult.canReadOutputFile'?: boolean; // present in 8023/630823 samples
  'toolUseResult.cancelledWakeups'?: number; // present in 76/630823 samples
  'toolUseResult.clampedDelaySeconds'?: number; // present in 258/630823 samples
  'toolUseResult.code'?: number; // present in 150/630823 samples
  'toolUseResult.codeText'?: string; // present in 150/630823 samples
  'toolUseResult.color'?: string; // present in 5/630823 samples
  'toolUseResult.command'?: string; // present in 123/630823 samples
  'toolUseResult.commandName'?: string; // present in 1323/630823 samples
  'toolUseResult.content'?: object | string; // present in 12081/630823 samples
  'toolUseResult.content.[]'?: object; // present in 4329/630823 samples
  'toolUseResult.content.[].text'?: string; // present in 4329/630823 samples
  'toolUseResult.content.[].type'?: string; // present in 4329/630823 samples
  'toolUseResult.contract'?: string; // present in 8/630823 samples
  'toolUseResult.countIsComplete'?: boolean; // present in 1133/630823 samples
  'toolUseResult.dangerouslyDisableSandbox'?: boolean; // present in 28/630823 samples
  'toolUseResult.description'?: string; // present in 8023/630823 samples
  'toolUseResult.disabledReason'?: string; // present in 11/630823 samples
  'toolUseResult.discardedCommits'?: number; // present in 33/630823 samples
  'toolUseResult.discardedFiles'?: number; // present in 33/630823 samples
  'toolUseResult.display'?: string; // present in 5/630823 samples
  'toolUseResult.durationMs'?: number; // present in 1283/630823 samples
  'toolUseResult.durationSeconds'?: number; // present in 106/630823 samples
  'toolUseResult.failed_mcp_servers'?: object; // present in 5/630823 samples
  'toolUseResult.failed_mcp_servers.[]'?: object; // present in 5/630823 samples
  'toolUseResult.failed_mcp_servers.[].error'?: string; // present in 5/630823 samples
  'toolUseResult.failed_mcp_servers.[].errorCode'?: string; // present in 5/630823 samples
  'toolUseResult.failed_mcp_servers.[].name'?: string; // present in 5/630823 samples
  'toolUseResult.file'?: object; // present in 24822/630823 samples
  'toolUseResult.file.base64'?: string; // present in 72/630823 samples
  'toolUseResult.file.content'?: string; // present in 24743/630823 samples
  'toolUseResult.file.dimensions'?: object; // present in 72/630823 samples
  'toolUseResult.file.dimensions.displayHeight'?: number; // present in 72/630823 samples
  'toolUseResult.file.dimensions.displayWidth'?: number; // present in 72/630823 samples
  'toolUseResult.file.dimensions.originalHeight'?: number; // present in 72/630823 samples
  'toolUseResult.file.dimensions.originalWidth'?: number; // present in 72/630823 samples
  'toolUseResult.file.filePath'?: string; // present in 24750/630823 samples
  'toolUseResult.file.numLines'?: number; // present in 24743/630823 samples
  'toolUseResult.file.originalSize'?: number; // present in 72/630823 samples
  'toolUseResult.file.startLine'?: number; // present in 24743/630823 samples
  'toolUseResult.file.totalLines'?: number; // present in 24743/630823 samples
  'toolUseResult.file.truncatedByTokenCap'?: boolean; // present in 64/630823 samples
  'toolUseResult.file.type'?: string; // present in 72/630823 samples
  'toolUseResult.fileCount'?: number; // present in 46/630823 samples
  'toolUseResult.filePath'?: string; // present in 10222/630823 samples
  'toolUseResult.filenames'?: object; // present in 7976/630823 samples
  'toolUseResult.filenames.[]'?: string; // present in 3775/630823 samples
  'toolUseResult.gitOperation'?: object; // present in 4618/630823 samples
  'toolUseResult.gitOperation.branch'?: object; // present in 290/630823 samples
  'toolUseResult.gitOperation.branch.action'?: string; // present in 290/630823 samples
  'toolUseResult.gitOperation.branch.ref'?: string; // present in 290/630823 samples
  'toolUseResult.gitOperation.commit'?: object; // present in 1830/630823 samples
  'toolUseResult.gitOperation.commit.branch'?: string; // present in 1104/630823 samples
  'toolUseResult.gitOperation.commit.kind'?: string; // present in 1830/630823 samples
  'toolUseResult.gitOperation.commit.sha'?: string; // present in 1830/630823 samples
  'toolUseResult.gitOperation.pr'?: object; // present in 1139/630823 samples
  'toolUseResult.gitOperation.pr.action'?: string; // present in 1139/630823 samples
  'toolUseResult.gitOperation.pr.number'?: number; // present in 1139/630823 samples
  'toolUseResult.gitOperation.pr.url'?: string; // present in 957/630823 samples
  'toolUseResult.gitOperation.push'?: object; // present in 1468/630823 samples
  'toolUseResult.gitOperation.push.branch'?: string; // present in 1468/630823 samples
  'toolUseResult.harnessNoteCount'?: number; // present in 1322/630823 samples
  'toolUseResult.harnessSectionHash'?: string; // present in 1322/630823 samples
  'toolUseResult.harnessTailCount'?: number; // present in 1322/630823 samples
  'toolUseResult.interrupted'?: boolean; // present in 79063/630823 samples
  'toolUseResult.isAsync'?: boolean; // present in 8023/630823 samples
  'toolUseResult.isImage'?: boolean; // present in 79063/630823 samples
  'toolUseResult.is_splitpane'?: boolean; // present in 5/630823 samples
  'toolUseResult.listing'?: string; // present in 4332/630823 samples
  'toolUseResult.liveSubscription'?: string; // present in 30/630823 samples
  'toolUseResult.localSent'?: boolean; // present in 11/630823 samples
  'toolUseResult.matches'?: object; // present in 2219/630823 samples
  'toolUseResult.matches.[]'?: string; // present in 2188/630823 samples
  'toolUseResult.memdirStamped'?: boolean; // present in 17/630823 samples
  'toolUseResult.message'?: string; // present in 1967/630823 samples
  'toolUseResult.mode'?: string; // present in 6843/630823 samples
  'toolUseResult.model'?: string; // present in 128/630823 samples
  'toolUseResult.msg_id'?: string; // present in 24/630823 samples
  'toolUseResult.name'?: string; // present in 5/630823 samples
  'toolUseResult.newString'?: string; // present in 6314/630823 samples
  'toolUseResult.newTodos'?: object; // present in 2610/630823 samples
  'toolUseResult.newTodos.[]'?: object; // present in 2610/630823 samples
  'toolUseResult.newTodos.[].activeForm'?: string; // present in 2610/630823 samples
  'toolUseResult.newTodos.[].content'?: string; // present in 2610/630823 samples
  'toolUseResult.newTodos.[].status'?: string; // present in 2610/630823 samples
  'toolUseResult.noOutputExpected'?: boolean; // present in 79063/630823 samples
  'toolUseResult.numFiles'?: number; // present in 7976/630823 samples
  'toolUseResult.numLines'?: number; // present in 3878/630823 samples
  'toolUseResult.numMatches'?: number; // present in 14/630823 samples
  'toolUseResult.oldString'?: string; // present in 6314/630823 samples
  'toolUseResult.oldTodos'?: object; // present in 2610/630823 samples
  'toolUseResult.oldTodos.[]'?: object; // present in 2209/630823 samples
  'toolUseResult.oldTodos.[].activeForm'?: string; // present in 2209/630823 samples
  'toolUseResult.oldTodos.[].content'?: string; // present in 2209/630823 samples
  'toolUseResult.oldTodos.[].status'?: string; // present in 2209/630823 samples
  'toolUseResult.operation'?: string; // present in 48/630823 samples
  'toolUseResult.originalCwd'?: string; // present in 202/630823 samples
  'toolUseResult.originalFile'?: object | string; // present in 10174/630823 samples
  'toolUseResult.outputFile'?: string; // present in 8023/630823 samples
  'toolUseResult.path'?: string; // present in 30/630823 samples
  'toolUseResult.persistedOutputPath'?: string; // present in 295/630823 samples
  'toolUseResult.persistedOutputSize'?: number; // present in 295/630823 samples
  'toolUseResult.persistent'?: boolean; // present in 138/630823 samples
  'toolUseResult.pin'?: object; // present in 1330/630823 samples
  'toolUseResult.pin.id'?: string; // present in 1330/630823 samples
  'toolUseResult.pin.name'?: string; // present in 1330/630823 samples
  'toolUseResult.pin.ref'?: string; // present in 1330/630823 samples
  'toolUseResult.plan_mode_required'?: boolean; // present in 5/630823 samples
  'toolUseResult.prompt'?: string; // present in 12357/630823 samples
  'toolUseResult.pushSent'?: boolean; // present in 11/630823 samples
  'toolUseResult.query'?: string; // present in 2325/630823 samples
  'toolUseResult.questions'?: object; // present in 1804/630823 samples
  'toolUseResult.questions.[]'?: object; // present in 1804/630823 samples
  'toolUseResult.questions.[].header'?: string; // present in 1804/630823 samples
  'toolUseResult.questions.[].multiSelect'?: boolean; // present in 1804/630823 samples
  'toolUseResult.questions.[].options'?: object; // present in 1804/630823 samples
  'toolUseResult.questions.[].options.[]'?: object; // present in 1804/630823 samples
  'toolUseResult.questions.[].question'?: string; // present in 1804/630823 samples
  'toolUseResult.replaceAll'?: boolean; // present in 6314/630823 samples
  'toolUseResult.resolvedModel'?: string; // present in 12352/630823 samples
  'toolUseResult.result'?: string; // present in 253/630823 samples
  'toolUseResult.resultCount'?: number; // present in 46/630823 samples
  'toolUseResult.results'?: object; // present in 106/630823 samples
  'toolUseResult.results.[]'?: object | string; // present in 106/630823 samples
  'toolUseResult.results.[].content'?: object; // present in 106/630823 samples
  'toolUseResult.results.[].content.[]'?: object; // present in 106/630823 samples
  'toolUseResult.results.[].tool_use_id'?: string; // present in 106/630823 samples
  'toolUseResult.resumedAgentId'?: string; // present in 885/630823 samples
  'toolUseResult.retrieval_status'?: string; // present in 154/630823 samples
  'toolUseResult.returnCodeInterpretation'?: string; // present in 235/630823 samples
  'toolUseResult.routing'?: object; // present in 21/630823 samples
  'toolUseResult.routing.content'?: string; // present in 21/630823 samples
  'toolUseResult.routing.sender'?: string; // present in 21/630823 samples
  'toolUseResult.routing.senderColor'?: string; // present in 20/630823 samples
  'toolUseResult.routing.summary'?: string; // present in 21/630823 samples
  'toolUseResult.routing.target'?: string; // present in 21/630823 samples
  'toolUseResult.routing.targetColor'?: string; // present in 21/630823 samples
  'toolUseResult.scheduledFor'?: number; // present in 258/630823 samples
  'toolUseResult.searchCount'?: number; // present in 106/630823 samples
  'toolUseResult.sentAt'?: string; // present in 11/630823 samples
  'toolUseResult.staleReadFileStateHint'?: string; // present in 88/630823 samples
  'toolUseResult.staleRecovered'?: boolean; // present in 71/630823 samples
  'toolUseResult.status'?: string; // present in 12412/630823 samples
  'toolUseResult.stderr'?: string; // present in 79063/630823 samples
  'toolUseResult.stdout'?: string; // present in 79063/630823 samples
  'toolUseResult.stopped'?: boolean; // present in 76/630823 samples
  'toolUseResult.structuredPatch'?: object; // present in 10174/630823 samples
  'toolUseResult.structuredPatch.[]'?: object; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].lines'?: object; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].lines.[]'?: string; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].newLines'?: number; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].newStart'?: number; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].oldLines'?: number; // present in 6698/630823 samples
  'toolUseResult.structuredPatch.[].oldStart'?: number; // present in 6698/630823 samples
  'toolUseResult.success'?: boolean; // present in 2684/630823 samples
  'toolUseResult.task'?: object; // present in 154/630823 samples
  'toolUseResult.task.description'?: string; // present in 154/630823 samples
  'toolUseResult.task.exitCode'?: number | object; // present in 48/630823 samples
  'toolUseResult.task.isRawTranscript'?: boolean; // present in 106/630823 samples
  'toolUseResult.task.output'?: string; // present in 154/630823 samples
  'toolUseResult.task.prompt'?: string; // present in 106/630823 samples
  'toolUseResult.task.result'?: string; // present in 106/630823 samples
  'toolUseResult.task.status'?: string; // present in 154/630823 samples
  'toolUseResult.task.task_id'?: string; // present in 154/630823 samples
  'toolUseResult.task.task_type'?: string; // present in 154/630823 samples
  'toolUseResult.taskId'?: string; // present in 138/630823 samples
  'toolUseResult.task_id'?: string; // present in 123/630823 samples
  'toolUseResult.task_type'?: string; // present in 123/630823 samples
  'toolUseResult.tasks'?: object; // present in 2/630823 samples
  'toolUseResult.team_name'?: string; // present in 5/630823 samples
  'toolUseResult.teammate_id'?: string; // present in 5/630823 samples
  'toolUseResult.timedOutAfterMs'?: number; // present in 266/630823 samples
  'toolUseResult.timeoutMs'?: number; // present in 138/630823 samples
  'toolUseResult.title'?: string; // present in 30/630823 samples
  'toolUseResult.tmux_pane_id'?: string; // present in 5/630823 samples
  'toolUseResult.tmux_session_name'?: string; // present in 5/630823 samples
  'toolUseResult.tmux_window_name'?: string; // present in 5/630823 samples
  'toolUseResult.toolStats'?: object; // present in 4318/630823 samples
  'toolUseResult.toolStats.bashCount'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.editFileCount'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.linesAdded'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.linesRemoved'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.otherToolCount'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.readCount'?: number; // present in 4318/630823 samples
  'toolUseResult.toolStats.searchCount'?: number; // present in 4318/630823 samples
  'toolUseResult.totalDurationMs'?: number; // present in 4329/630823 samples
  'toolUseResult.totalFiles'?: number; // present in 2951/630823 samples
  'toolUseResult.totalLines'?: number; // present in 3878/630823 samples
  'toolUseResult.totalMatches'?: number; // present in 1133/630823 samples
  'toolUseResult.totalTokens'?: number; // present in 4329/630823 samples
  'toolUseResult.totalToolUseCount'?: number; // present in 4329/630823 samples
  'toolUseResult.total_deferred_tools'?: number; // present in 2219/630823 samples
  'toolUseResult.truncated'?: boolean; // present in 1135/630823 samples
  'toolUseResult.type'?: string; // present in 28682/630823 samples
  'toolUseResult.updated'?: boolean; // present in 30/630823 samples
  'toolUseResult.url'?: string; // present in 180/630823 samples
  'toolUseResult.usage'?: object; // present in 4329/630823 samples
  'toolUseResult.usage.cache_creation'?: object; // present in 4329/630823 samples
  'toolUseResult.usage.cache_creation.ephemeral_1h_input_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.cache_creation.ephemeral_5m_input_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.cache_creation_input_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.cache_read_input_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.inference_geo'?: string; // present in 4329/630823 samples
  'toolUseResult.usage.input_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.iterations'?: object; // present in 4329/630823 samples
  'toolUseResult.usage.iterations.[]'?: object; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].cache_creation'?: object; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].cache_read_input_tokens'?: number; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].input_tokens'?: number; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].output_tokens'?: number; // present in 4324/630823 samples
  'toolUseResult.usage.iterations.[].type'?: string; // present in 4324/630823 samples
  'toolUseResult.usage.output_tokens'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.output_tokens_details'?: object; // present in 2201/630823 samples
  'toolUseResult.usage.output_tokens_details.thinking_tokens'?: number; // present in 2201/630823 samples
  'toolUseResult.usage.server_tool_use'?: object; // present in 4329/630823 samples
  'toolUseResult.usage.server_tool_use.web_fetch_requests'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.server_tool_use.web_search_requests'?: number; // present in 4329/630823 samples
  'toolUseResult.usage.service_tier'?: string; // present in 4329/630823 samples
  'toolUseResult.usage.speed'?: string; // present in 4329/630823 samples
  'toolUseResult.userModified'?: boolean; // present in 10174/630823 samples
  'toolUseResult.version'?: string; // present in 30/630823 samples
  'toolUseResult.wasClamped'?: boolean; // present in 258/630823 samples
  'toolUseResult.worktreeBranch'?: string; // present in 142/630823 samples
  'toolUseResult.worktreePath'?: string; // present in 474/630823 samples
  turnCompanion?: boolean; // present in 1545/630823 samples
  turnOrigin?: string; // present in 352/630823 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"worktree-state"`. Observed 24070 time(s), CLI "(unknown)".
 */
export interface WorktreeState {
  sessionId: string;
  type: string;
  worktreeSession: object;
  'worktreeSession.enteredExisting'?: boolean; // present in 6254/24070 samples
  'worktreeSession.hookBased'?: boolean; // present in 15891/24070 samples
  'worktreeSession.originalBranch'?: string; // present in 190/24070 samples
  'worktreeSession.originalCwd'?: string; // present in 22335/24070 samples
  'worktreeSession.originalHeadCommit'?: string; // present in 190/24070 samples
  'worktreeSession.preEnterOriginalCwd'?: string; // present in 22335/24070 samples
  'worktreeSession.sessionId'?: string; // present in 22335/24070 samples
  'worktreeSession.worktreeBranch'?: string; // present in 6444/24070 samples
  'worktreeSession.worktreeName'?: string; // present in 22335/24070 samples
  'worktreeSession.worktreePath'?: string; // present in 22335/24070 samples
}
