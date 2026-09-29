/**
 * AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, not a runtime contract, do not hand-edit, do not import from runtime parsing code.
 *
 * Generated: 2026-09-29T01:21:08.471Z
 * CLI versions observed: "2.1.215", "2.1.218", "2.1.219", "2.1.220", "2.1.221", "2.1.222", "2.1.223", "2.1.224", "2.1.226", "2.1.227", "2.1.228", "2.1.229", "2.1.231", "2.1.232", "2.1.233", "2.1.234", "2.1.235", "2.1.237", "2.1.238", "2.1.239", "2.1.240", "2.1.241", "2.1.245", "2.1.246", "2.1.247", "2.1.250", "2.1.251", "2.1.252", "2.1.257", "2.1.258", "2.1.259", "2.1.260", "2.1.261", "2.1.263", "2.1.266", "2.1.267", "2.1.269", "2.1.270", "2.1.272", "2.1.275", "2.1.276", "2.1.278", "2.1.280", "2.1.281", "2.1.282", "2.1.283", "2.1.284"
 *
 * Rendered from scripts/schema-gen/schema-observations.json by generateTsReference.ts (T9,
 * see transcript-schema-gen.md). Each interface below is one observed transcript `type` (or
 * `type:subtype`) bucket; each property is the exact dotted field path recorded by
 * schemaAggregator.ts (`[]` marks a collapsed array segment), typed as the union of JS
 * `typeof` values actually observed. A trailing `?` plus a presence-count comment means the
 * field was not present on every sampled line of that bucket.
 */

/**
 * Transcript type `"agent-name"`. Observed 27379 time(s), CLI "(unknown)".
 */
export interface AgentName {
  agentName: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"ai-title"`. Observed 73218 time(s), CLI "(unknown)".
 */
export interface AiTitle {
  aiTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"artifact-autoreact-ledger"`. Observed 161 time(s), CLI "(unknown)".
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
 * Transcript type `"artifact-comment-monitor"`. Observed 49 time(s), CLI "(unknown)".
 */
export interface ArtifactCommentMonitor {
  artifacts: object;
  'artifacts.[dynamic-key]': object;
  sessionId: string;
  type: string;
  v: number;
}

/**
 * Transcript type `"assistant"`. Observed 1456282 time(s), CLI "2.1.215–2.1.284".
 */
export interface Assistant {
  advisorModel?: string; // present in 48241/1456282 samples
  agentId?: string; // present in 1035219/1456282 samples
  apiBlockIndex?: number; // present in 569859/1456282 samples
  apiError?: string; // present in 3/1456282 samples
  apiErrorStatus?: number; // present in 153/1456282 samples
  attributionAgent?: string; // present in 1023821/1456282 samples
  attributionMcpServer?: string; // present in 44349/1456282 samples
  attributionMcpTool?: string; // present in 44349/1456282 samples
  attributionPlugin?: string; // present in 240884/1456282 samples
  attributionSkill?: string; // present in 472339/1456282 samples
  cwd: string;
  effort?: string; // present in 1381703/1456282 samples
  entrypoint: string;
  error?: string; // present in 323/1456282 samples
  errorDetails?: string; // present in 2/1456282 samples
  gitBranch: string;
  isAbortedMidStream?: boolean; // present in 39/1456282 samples
  isApiErrorMessage?: boolean; // present in 379/1456282 samples
  isSidechain: boolean;
  message: object;
  'message.container'?: object; // present in 343000/1456282 samples
  'message.content': object;
  'message.content.[]': object;
  'message.content.[].caller'?: object; // present in 804406/1456282 samples
  'message.content.[].caller.type'?: string; // present in 804406/1456282 samples
  'message.content.[].citations'?: object; // present in 2/1456282 samples
  'message.content.[].from'?: object; // present in 1/1456282 samples
  'message.content.[].from.model'?: string; // present in 1/1456282 samples
  'message.content.[].id'?: string; // present in 804406/1456282 samples
  'message.content.[].input'?: object; // present in 804406/1456282 samples
  'message.content.[].input.[dynamic-key]'?: boolean | number | object | string; // present in 27612/1456282 samples
  'message.content.[].input.__unparsedToolInput'?: object; // present in 135/1456282 samples
  'message.content.[].input.action'?: string; // present in 345/1456282 samples
  'message.content.[].input.allowed_domains'?: object; // present in 6/1456282 samples
  'message.content.[].input.args'?: object | string; // present in 1600/1456282 samples
  'message.content.[].input.block'?: boolean | string; // present in 169/1456282 samples
  'message.content.[].input.code'?: string; // present in 1/1456282 samples
  'message.content.[].input.command'?: string; // present in 439033/1456282 samples
  'message.content.[].input.content'?: string; // present in 21715/1456282 samples
  'message.content.[].input.context'?: number; // present in 3/1456282 samples
  'message.content.[].input.cron'?: string; // present in 2/1456282 samples
  'message.content.[].input.dangerouslyDisableSandbox'?: boolean; // present in 112/1456282 samples
  'message.content.[].input.delaySeconds'?: number; // present in 226/1456282 samples
  'message.content.[].input.description'?: string; // present in 406742/1456282 samples
  'message.content.[].input.discard_changes'?: boolean; // present in 42/1456282 samples
  'message.content.[].input.favicon'?: string; // present in 36/1456282 samples
  'message.content.[].input.file_path'?: string; // present in 284986/1456282 samples
  'message.content.[].input.findings'?: object; // present in 1844/1456282 samples
  'message.content.[].input.glob'?: string; // present in 726/1456282 samples
  'message.content.[].input.head_limit'?: number | string; // present in 1732/1456282 samples
  'message.content.[].input.icon'?: string; // present in 1/1456282 samples
  'message.content.[].input.id'?: string; // present in 4/1456282 samples
  'message.content.[].input.intent'?: string; // present in 2/1456282 samples
  'message.content.[].input.isolation'?: string; // present in 14/1456282 samples
  'message.content.[].input.label'?: string; // present in 14/1456282 samples
  'message.content.[].input.language'?: string; // present in 1/1456282 samples
  'message.content.[].input.limit'?: number; // present in 43600/1456282 samples
  'message.content.[].input.max_results'?: number | string; // present in 6883/1456282 samples
  'message.content.[].input.message'?: string; // present in 3275/1456282 samples
  'message.content.[].input.model'?: string; // present in 16257/1456282 samples
  'message.content.[].input.multiline'?: boolean; // present in 27/1456282 samples
  'message.content.[].input.name'?: string; // present in 8893/1456282 samples
  'message.content.[].input.new_new_string_placeholder'?: string; // present in 5/1456282 samples
  'message.content.[].input.new_string'?: string; // present in 67307/1456282 samples
  'message.content.[].input.noop'?: boolean; // present in 154/1456282 samples
  'message.content.[].input.note'?: string; // present in 2/1456282 samples
  'message.content.[].input.offset'?: number | object; // present in 38521/1456282 samples
  'message.content.[].input.old_string'?: string; // present in 67313/1456282 samples
  'message.content.[].input.old_string_is_regex'?: string; // present in 2/1456282 samples
  'message.content.[].input.output_mode'?: string; // present in 11154/1456282 samples
  'message.content.[].input.parameter2'?: string; // present in 4/1456282 samples
  'message.content.[].input.path'?: string; // present in 8997/1456282 samples
  'message.content.[].input.pattern'?: string; // present in 13186/1456282 samples
  'message.content.[].input.persistent'?: boolean; // present in 469/1456282 samples
  'message.content.[].input.prompt'?: string; // present in 20054/1456282 samples
  'message.content.[].input.query'?: string; // present in 8876/1456282 samples
  'message.content.[].input.questions'?: object; // present in 2256/1456282 samples
  'message.content.[].input.reason'?: string; // present in 226/1456282 samples
  'message.content.[].input.recipient'?: string; // present in 3264/1456282 samples
  'message.content.[].input.recurring'?: boolean; // present in 2/1456282 samples
  'message.content.[].input.replace_all'?: boolean | string; // present in 67289/1456282 samples
  'message.content.[].input.run_in_background'?: boolean | string; // present in 17749/1456282 samples
  'message.content.[].input.script'?: string; // present in 3/1456282 samples
  'message.content.[].input.server'?: string; // present in 1/1456282 samples
  'message.content.[].input.skill'?: string; // present in 3513/1456282 samples
  'message.content.[].input.stop'?: boolean; // present in 88/1456282 samples
  'message.content.[].input.subagent_type'?: string; // present in 18453/1456282 samples
  'message.content.[].input.summary'?: string; // present in 3237/1456282 samples
  'message.content.[].input.target_id'?: string; // present in 1/1456282 samples
  'message.content.[].input.target_type'?: string; // present in 1/1456282 samples
  'message.content.[].input.task_id'?: string; // present in 467/1456282 samples
  'message.content.[].input.timeout'?: number | string; // present in 42469/1456282 samples
  'message.content.[].input.timeout_ms'?: number | string; // present in 528/1456282 samples
  'message.content.[].input.to'?: string; // present in 3269/1456282 samples
  'message.content.[].input.type'?: string; // present in 3278/1456282 samples
  'message.content.[].input.until'?: string; // present in 1/1456282 samples
  'message.content.[].input.url'?: string; // present in 1309/1456282 samples
  'message.content.[].name'?: string; // present in 804406/1456282 samples
  'message.content.[].signature'?: string; // present in 459560/1456282 samples
  'message.content.[].text'?: string; // present in 192439/1456282 samples
  'message.content.[].thinking'?: string; // present in 459560/1456282 samples
  'message.content.[].to'?: object; // present in 1/1456282 samples
  'message.content.[].to.model'?: string; // present in 1/1456282 samples
  'message.content.[].type': string;
  'message.context_management'?: object; // present in 343108/1456282 samples
  'message.context_management.applied_edits'?: object; // present in 174/1456282 samples
  'message.diagnostics'?: object; // present in 1456201/1456282 samples
  'message.diagnostics.cache_miss_reason'?: object; // present in 14505/1456282 samples
  'message.diagnostics.cache_miss_reason.cache_missed_input_tokens'?: number; // present in 11201/1456282 samples
  'message.diagnostics.cache_miss_reason.type'?: string; // present in 14505/1456282 samples
  'message.id': string;
  'message.input_transformations'?: object; // present in 146939/1456282 samples
  'message.input_transformations.[]'?: object; // present in 3285/1456282 samples
  'message.input_transformations.[].path'?: string; // present in 3285/1456282 samples
  'message.input_transformations.[].reason'?: string; // present in 3285/1456282 samples
  'message.input_transformations.[].type'?: string; // present in 3285/1456282 samples
  'message.model': string;
  'message.role': string;
  'message.stop_details': object;
  'message.stop_details.category'?: string; // present in 4/1456282 samples
  'message.stop_details.explanation'?: string; // present in 4/1456282 samples
  'message.stop_details.type'?: string; // present in 4/1456282 samples
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
  'message.usage.iterations'?: object; // present in 805790/1456282 samples
  'message.usage.iterations.[]'?: object; // present in 805332/1456282 samples
  'message.usage.iterations.[].cache_creation'?: object; // present in 805332/1456282 samples
  'message.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 805332/1456282 samples
  'message.usage.iterations.[].cache_read_input_tokens'?: number; // present in 805332/1456282 samples
  'message.usage.iterations.[].input_tokens'?: number; // present in 805332/1456282 samples
  'message.usage.iterations.[].model'?: object | string; // present in 24/1456282 samples
  'message.usage.iterations.[].output_tokens'?: number; // present in 805332/1456282 samples
  'message.usage.iterations.[].type'?: string; // present in 805332/1456282 samples
  'message.usage.output_tokens': number;
  'message.usage.output_tokens_details'?: object; // present in 612866/1456282 samples
  'message.usage.output_tokens_details.thinking_tokens'?: number; // present in 612568/1456282 samples
  'message.usage.server_tool_use'?: object; // present in 805790/1456282 samples
  'message.usage.server_tool_use.web_fetch_requests'?: number; // present in 805790/1456282 samples
  'message.usage.server_tool_use.web_search_requests'?: number; // present in 805790/1456282 samples
  'message.usage.service_tier': object | string;
  'message.usage.speed'?: object | string; // present in 805790/1456282 samples
  parentUuid: string;
  perTurnEffort?: object | string; // present in 256652/1456282 samples
  quotaLimits?: object; // present in 75/1456282 samples
  'quotaLimits.isUsingOverage'?: boolean; // present in 75/1456282 samples
  'quotaLimits.overageDisabledReason'?: string; // present in 75/1456282 samples
  'quotaLimits.overageStatus'?: string; // present in 75/1456282 samples
  'quotaLimits.rateLimitType'?: string; // present in 75/1456282 samples
  'quotaLimits.resetsAt'?: number; // present in 75/1456282 samples
  'quotaLimits.status'?: string; // present in 75/1456282 samples
  'quotaLimits.unifiedRateLimitFallbackAvailable'?: boolean; // present in 75/1456282 samples
  requestId?: string; // present in 1456055/1456282 samples
  sessionId: string;
  session_id?: string; // present in 4851/1456282 samples
  slug?: string; // present in 216523/1456282 samples
  supersedesUuids?: object; // present in 8/1456282 samples
  'supersedesUuids.[]'?: string; // present in 8/1456282 samples
  timestamp: string;
  truncatedAfterOutput?: boolean; // present in 4/1456282 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
  wireIngestContext?: object; // present in 25381/1456282 samples
  'wireIngestContext.[dynamic-key]'?: object; // present in 25381/1456282 samples
  wireToolInputs?: object; // present in 109093/1456282 samples
  'wireToolInputs.[dynamic-key]'?: object; // present in 109093/1456282 samples
}

/**
 * Transcript type `"atis-latch"`. Observed 58421 time(s), CLI "(unknown)".
 */
export interface AtisLatch {
  atis: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"attachment"`. Observed 2573425 time(s), CLI "2.1.215–2.1.284".
 */
export interface Attachment {
  agentId?: string; // present in 1422701/2573425 samples
  attachment: object;
  'attachment.addedBlocks'?: object; // present in 7534/2573425 samples
  'attachment.addedBlocks.[]'?: string; // present in 7491/2573425 samples
  'attachment.addedLines'?: object; // present in 37420/2573425 samples
  'attachment.addedLines.[]'?: string; // present in 31627/2573425 samples
  'attachment.addedNames'?: object; // present in 34356/2573425 samples
  'attachment.addedNames.[]'?: string; // present in 28581/2573425 samples
  'attachment.addedTypes'?: object; // present in 10598/2573425 samples
  'attachment.addedTypes.[]'?: string; // present in 10574/2573425 samples
  'attachment.allowedTools'?: object; // present in 3898/2573425 samples
  'attachment.allowedTools.[]'?: string; // present in 249/2573425 samples
  'attachment.autoModeConsentFlow'?: boolean; // present in 5003/2573425 samples
  'attachment.banner'?: string; // present in 1132/2573425 samples
  'attachment.bashFirst'?: boolean; // present in 5003/2573425 samples
  'attachment.bashFirstSteer'?: string; // present in 4115/2573425 samples
  'attachment.blockHashes'?: object; // present in 14/2573425 samples
  'attachment.blockHashes.[]'?: string; // present in 14/2573425 samples
  'attachment.blockingError'?: object; // present in 3939/2573425 samples
  'attachment.blockingError.blockingError'?: string; // present in 3939/2573425 samples
  'attachment.blockingError.command'?: string; // present in 3939/2573425 samples
  'attachment.bypass'?: boolean; // present in 5003/2573425 samples
  'attachment.changed'?: boolean; // present in 200/2573425 samples
  'attachment.changes'?: object; // present in 248/2573425 samples
  'attachment.changes.[]'?: object; // present in 248/2573425 samples
  'attachment.changes.[].added'?: object; // present in 3/2573425 samples
  'attachment.changes.[].added.[]'?: string; // present in 2/2573425 samples
  'attachment.changes.[].field'?: string; // present in 248/2573425 samples
  'attachment.changes.[].from'?: string; // present in 242/2573425 samples
  'attachment.changes.[].removed'?: object; // present in 3/2573425 samples
  'attachment.changes.[].removed.[]'?: string; // present in 1/2573425 samples
  'attachment.clearAt'?: string; // present in 158/2573425 samples
  'attachment.cliPrefix'?: string; // present in 4065/2573425 samples
  'attachment.clientChange'?: object; // present in 14/2573425 samples
  'attachment.clientChange.baseline'?: string; // present in 14/2573425 samples
  'attachment.clientChange.callNumber'?: number; // present in 14/2573425 samples
  'attachment.clientChange.firstChangedMessageIndex'?: number; // present in 14/2573425 samples
  'attachment.clientChange.kinds'?: string; // present in 14/2573425 samples
  'attachment.command'?: string; // present in 1859501/2573425 samples
  'attachment.commandMode'?: string; // present in 9220/2573425 samples
  'attachment.commit'?: string; // present in 3732/2573425 samples
  'attachment.condition'?: string; // present in 656/2573425 samples
  'attachment.content'?: object | string; // present in 2102156/2573425 samples
  'attachment.content.[]'?: object | string; // present in 158189/2573425 samples
  'attachment.content.[].activeForm'?: string; // present in 3008/2573425 samples
  'attachment.content.[].content'?: string; // present in 3008/2573425 samples
  'attachment.content.[].status'?: string; // present in 3008/2573425 samples
  'attachment.content.content'?: string; // present in 55957/2573425 samples
  'attachment.content.contentDiffersFromDisk'?: boolean; // present in 55957/2573425 samples
  'attachment.content.file'?: object; // present in 475/2573425 samples
  'attachment.content.file.content'?: string; // present in 473/2573425 samples
  'attachment.content.file.filePath'?: string; // present in 475/2573425 samples
  'attachment.content.file.numLines'?: number; // present in 473/2573425 samples
  'attachment.content.file.startLine'?: number; // present in 473/2573425 samples
  'attachment.content.file.totalLines'?: number; // present in 473/2573425 samples
  'attachment.content.globs'?: object; // present in 44074/2573425 samples
  'attachment.content.globs.[]'?: string; // present in 44074/2573425 samples
  'attachment.content.parent'?: string; // present in 181/2573425 samples
  'attachment.content.path'?: string; // present in 55957/2573425 samples
  'attachment.content.rawContent'?: string; // present in 44967/2573425 samples
  'attachment.content.type'?: string; // present in 56432/2573425 samples
  'attachment.context'?: object; // present in 4869/2573425 samples
  'attachment.context.gitStatus'?: string; // present in 4021/2573425 samples
  'attachment.context.userEmail'?: string; // present in 4759/2573425 samples
  'attachment.contextRendering'?: string; // present in 1577/2573425 samples
  'attachment.data'?: object; // present in 2148/2573425 samples
  'attachment.data.[dynamic-key]'?: object | string; // present in 414/2573425 samples
  'attachment.data.findings'?: object; // present in 1729/2573425 samples
  'attachment.data.findings.[]'?: object; // present in 40/2573425 samples
  'attachment.data.findings.[].category'?: string; // present in 40/2573425 samples
  'attachment.data.findings.[].confidence'?: number; // present in 31/2573425 samples
  'attachment.data.findings.[].explanation'?: string; // present in 40/2573425 samples
  'attachment.data.findings.[].filePath'?: string; // present in 40/2573425 samples
  'attachment.data.findings.[].fix'?: string; // present in 40/2573425 samples
  'attachment.data.findings.[].severity'?: string; // present in 40/2573425 samples
  'attachment.data.findings.[].vulnerableCode'?: string; // present in 40/2573425 samples
  'attachment.data.refuted'?: object; // present in 5/2573425 samples
  'attachment.data.survived'?: object; // present in 5/2573425 samples
  'attachment.data.survived.[]'?: number; // present in 5/2573425 samples
  'attachment.date'?: string; // present in 5367/2573425 samples
  'attachment.deltaSummary'?: object; // present in 56/2573425 samples
  'attachment.description'?: string; // present in 56/2573425 samples
  'attachment.displayPath'?: string; // present in 56581/2573425 samples
  'attachment.durationMs'?: number; // present in 1859623/2573425 samples
  'attachment.echoWireToolInputs'?: boolean; // present in 1577/2573425 samples
  'attachment.entries'?: object; // present in 10706/2573425 samples
  'attachment.entries.[]'?: object; // present in 1862/2573425 samples
  'attachment.entries.[].defer_loading'?: boolean; // present in 1862/2573425 samples
  'attachment.entries.[].description'?: string; // present in 1862/2573425 samples
  'attachment.entries.[].eager_input_streaming'?: boolean; // present in 1862/2573425 samples
  'attachment.entries.[].input_schema'?: object; // present in 1862/2573425 samples
  'attachment.entries.[].input_schema.$schema'?: string; // present in 1344/2573425 samples
  'attachment.entries.[].input_schema.additionalProperties'?: boolean; // present in 579/2573425 samples
  'attachment.entries.[].input_schema.properties'?: object; // present in 1862/2573425 samples
  'attachment.entries.[].input_schema.required'?: object; // present in 1698/2573425 samples
  'attachment.entries.[].input_schema.type'?: string; // present in 1862/2573425 samples
  'attachment.entries.[].name'?: string; // present in 1862/2573425 samples
  'attachment.exitCode'?: number; // present in 1858791/2573425 samples
  'attachment.failedMcpServers'?: object; // present in 7586/2573425 samples
  'attachment.failedMcpServers.[]'?: object; // present in 3957/2573425 samples
  'attachment.failedMcpServers.[].error'?: string; // present in 3957/2573425 samples
  'attachment.failedMcpServers.[].errorCode'?: string; // present in 3951/2573425 samples
  'attachment.failedMcpServers.[].name'?: string; // present in 3957/2573425 samples
  'attachment.filename'?: string; // present in 2711/2573425 samples
  'attachment.files'?: object; // present in 7994/2573425 samples
  'attachment.files.[]'?: object; // present in 7994/2573425 samples
  'attachment.files.[].content'?: string; // present in 4624/2573425 samples
  'attachment.files.[].diagnostics'?: object; // present in 3370/2573425 samples
  'attachment.files.[].diagnostics.[]'?: object; // present in 3370/2573425 samples
  'attachment.files.[].path'?: string; // present in 4624/2573425 samples
  'attachment.files.[].type'?: string; // present in 4624/2573425 samples
  'attachment.files.[].uri'?: string; // present in 3370/2573425 samples
  'attachment.firstReportForThreadInProcess'?: boolean; // present in 14/2573425 samples
  'attachment.hookEvent'?: string; // present in 2021813/2573425 samples
  'attachment.hookName'?: string; // present in 2021813/2573425 samples
  'attachment.humanTurn'?: boolean; // present in 95/2573425 samples
  'attachment.ideName'?: string; // present in 5/2573425 samples
  'attachment.identity'?: object; // present in 4646/2573425 samples
  'attachment.identity.knowledgeCutoff'?: object | string; // present in 4646/2573425 samples
  'attachment.identity.marketingName'?: object | string; // present in 4646/2573425 samples
  'attachment.identity.modelId'?: string; // present in 4646/2573425 samples
  'attachment.inlineTools'?: boolean; // present in 65/2573425 samples
  'attachment.isInitial'?: boolean; // present in 32933/2573425 samples
  'attachment.isMeta'?: boolean; // present in 474/2573425 samples
  'attachment.isNew'?: boolean; // present in 3370/2573425 samples
  'attachment.isSubAgent'?: boolean; // present in 1/2573425 samples
  'attachment.itemCount'?: number; // present in 8917/2573425 samples
  'attachment.iterations'?: number; // present in 122/2573425 samples
  'attachment.keptReminders'?: boolean; // present in 619/2573425 samples
  'attachment.language'?: string; // present in 893/2573425 samples
  'attachment.lineEnd'?: number; // present in 5/2573425 samples
  'attachment.lineStart'?: number; // present in 5/2573425 samples
  'attachment.managedCommit'?: boolean; // present in 3380/2573425 samples
  'attachment.managedPr'?: boolean; // present in 3380/2573425 samples
  'attachment.maxTurns'?: number; // present in 276/2573425 samples
  'attachment.met'?: boolean; // present in 656/2573425 samples
  'attachment.model'?: string; // present in 6199/2573425 samples
  'attachment.nameOnlyAnnouncements'?: object; // present in 1423/2573425 samples
  'attachment.nameOnlyAnnouncements.[]'?: string; // present in 1423/2573425 samples
  'attachment.names'?: object; // present in 22335/2573425 samples
  'attachment.names.[]'?: string; // present in 22335/2573425 samples
  'attachment.needsAuthMcpServers'?: object; // present in 10710/2573425 samples
  'attachment.needsAuthMcpServers.[]'?: string; // present in 5590/2573425 samples
  'attachment.newDate'?: string; // present in 555/2573425 samples
  'attachment.newlyDropped'?: object; // present in 14/2573425 samples
  'attachment.newlyDropped.blockCount'?: number; // present in 14/2573425 samples
  'attachment.newlyDropped.first'?: object; // present in 14/2573425 samples
  'attachment.newlyDropped.first.blockIndex'?: number; // present in 14/2573425 samples
  'attachment.newlyDropped.first.messageIndex'?: number; // present in 14/2573425 samples
  'attachment.newlyDropped.last'?: object; // present in 14/2573425 samples
  'attachment.newlyDropped.last.blockIndex'?: number; // present in 14/2573425 samples
  'attachment.newlyDropped.last.messageIndex'?: number; // present in 14/2573425 samples
  'attachment.newlyDropped.reason'?: string; // present in 14/2573425 samples
  'attachment.newlyDropped.reasonCounts'?: object; // present in 10/2573425 samples
  'attachment.newlyDropped.reasonCounts.model_mismatch'?: number; // present in 5/2573425 samples
  'attachment.newlyDropped.reasonCounts.prefix_mismatch'?: number; // present in 5/2573425 samples
  'attachment.newlyDropped.turnCount'?: number; // present in 14/2573425 samples
  'attachment.organizationUuid'?: string; // present in 1250/2573425 samples
  'attachment.origin'?: object; // present in 2036/2573425 samples
  'attachment.origin.body'?: string; // present in 286/2573425 samples
  'attachment.origin.from'?: string; // present in 286/2573425 samples
  'attachment.origin.fromMode'?: string; // present in 13/2573425 samples
  'attachment.origin.hopChain'?: object; // present in 3/2573425 samples
  'attachment.origin.hopChain.[]'?: string; // present in 3/2573425 samples
  'attachment.origin.kind'?: string; // present in 2036/2573425 samples
  'attachment.origin.msg_id'?: string; // present in 13/2573425 samples
  'attachment.origin.name'?: string; // present in 286/2573425 samples
  'attachment.origin.producer'?: string; // present in 22/2573425 samples
  'attachment.origin.senderTaskId'?: string; // present in 273/2573425 samples
  'attachment.origin.verifiedPeerPid'?: number; // present in 13/2573425 samples
  'attachment.outputFilePath'?: string; // present in 56/2573425 samples
  'attachment.path'?: string; // present in 55957/2573425 samples
  'attachment.pendingMcpServers'?: object; // present in 10851/2573425 samples
  'attachment.pendingMcpServers.[]'?: string; // present in 197/2573425 samples
  'attachment.planExists'?: boolean; // present in 1/2573425 samples
  'attachment.planFilePath'?: string; // present in 1/2573425 samples
  'attachment.pr'?: string; // present in 3732/2573425 samples
  'attachment.prompt'?: object | string; // present in 9534/2573425 samples
  'attachment.prompt.[]'?: object; // present in 1501/2573425 samples
  'attachment.prompt.[].source'?: object; // present in 47/2573425 samples
  'attachment.prompt.[].source.data'?: string; // present in 47/2573425 samples
  'attachment.prompt.[].source.media_type'?: string; // present in 47/2573425 samples
  'attachment.prompt.[].source.type'?: string; // present in 47/2573425 samples
  'attachment.prompt.[].text'?: string; // present in 1501/2573425 samples
  'attachment.prompt.[].type'?: string; // present in 1501/2573425 samples
  'attachment.querySource'?: string; // present in 14/2573425 samples
  'attachment.readdedNames'?: object; // present in 26822/2573425 samples
  'attachment.readdedNames.[]'?: string; // present in 39/2573425 samples
  'attachment.reason'?: string; // present in 575/2573425 samples
  'attachment.reminderFold'?: boolean; // present in 2395/2573425 samples
  'attachment.reminderType'?: string; // present in 1/2573425 samples
  'attachment.removed'?: object; // present in 32/2573425 samples
  'attachment.removed.[]'?: string; // present in 32/2573425 samples
  'attachment.removedNames'?: object; // present in 34356/2573425 samples
  'attachment.removedNames.[]'?: string; // present in 412/2573425 samples
  'attachment.removedTypes'?: object; // present in 10598/2573425 samples
  'attachment.removedTypes.[]'?: string; // present in 26/2573425 samples
  'attachment.requestId'?: string; // present in 14/2573425 samples
  'attachment.scope'?: string; // present in 14/2573425 samples
  'attachment.sendUserFileHint'?: boolean; // present in 3732/2573425 samples
  'attachment.sentinel'?: boolean; // present in 160/2573425 samples
  'attachment.shell'?: object; // present in 1/2573425 samples
  'attachment.shell.command'?: string; // present in 1/2573425 samples
  'attachment.shell.kind'?: string; // present in 1/2573425 samples
  'attachment.shell.toolUseId'?: string; // present in 1/2573425 samples
  'attachment.showConcurrencyNote'?: boolean; // present in 10598/2573425 samples
  'attachment.skillCount'?: number; // present in 22335/2573425 samples
  'attachment.skillDir'?: string; // present in 52/2573425 samples
  'attachment.skillNames'?: object; // present in 52/2573425 samples
  'attachment.skillNames.[]'?: string; // present in 52/2573425 samples
  'attachment.skills'?: object; // present in 69/2573425 samples
  'attachment.skills.[]'?: object; // present in 69/2573425 samples
  'attachment.skills.[].content'?: string; // present in 69/2573425 samples
  'attachment.skills.[].name'?: string; // present in 69/2573425 samples
  'attachment.skills.[].path'?: string; // present in 69/2573425 samples
  'attachment.snapshot'?: object; // present in 4768/2573425 samples
  'attachment.snapshot.additionalWorkingDirectories'?: object; // present in 4768/2573425 samples
  'attachment.snapshot.additionalWorkingDirectories.[]'?: string; // present in 4089/2573425 samples
  'attachment.snapshot.isGitRepo'?: boolean; // present in 4768/2573425 samples
  'attachment.snapshot.isWorktree'?: boolean; // present in 4768/2573425 samples
  'attachment.snapshot.osVersion'?: string; // present in 4768/2573425 samples
  'attachment.snapshot.platform'?: string; // present in 4768/2573425 samples
  'attachment.snapshot.scratchpadDirectory'?: string; // present in 3530/2573425 samples
  'attachment.snapshot.shell'?: string; // present in 4768/2573425 samples
  'attachment.snapshot.workingDirectory'?: string; // present in 4768/2573425 samples
  'attachment.snippet'?: string; // present in 2125/2573425 samples
  'attachment.source_uuid'?: string; // present in 2815/2573425 samples
  'attachment.status'?: string; // present in 56/2573425 samples
  'attachment.stderr'?: string; // present in 1858791/2573425 samples
  'attachment.stdout'?: string; // present in 1858791/2573425 samples
  'attachment.steerOnly'?: boolean; // present in 5003/2573425 samples
  'attachment.style'?: object | string; // present in 79527/2573425 samples
  'attachment.style.name'?: string; // present in 895/2573425 samples
  'attachment.style.prompt'?: string; // present in 895/2573425 samples
  'attachment.surfacedNames'?: object; // present in 2407/2573425 samples
  'attachment.surfacedNames.[]'?: string; // present in 2407/2573425 samples
  'attachment.systemPrompt'?: object; // present in 8405/2573425 samples
  'attachment.systemPrompt.[]'?: string; // present in 8405/2573425 samples
  'attachment.systemTurns'?: boolean; // present in 619/2573425 samples
  'attachment.taskId'?: string; // present in 56/2573425 samples
  'attachment.taskType'?: string; // present in 56/2573425 samples
  'attachment.text'?: string; // present in 265741/2573425 samples
  'attachment.thinkingBlocksSent'?: number; // present in 14/2573425 samples
  'attachment.thinkingTurnsSent'?: number; // present in 14/2573425 samples
  'attachment.timedOut'?: boolean; // present in 710/2573425 samples
  'attachment.timeoutMs'?: number; // present in 710/2573425 samples
  'attachment.timestamp'?: string; // present in 9220/2573425 samples
  'attachment.tokens'?: number; // present in 122/2573425 samples
  'attachment.toolChangeHeader'?: boolean; // present in 65/2573425 samples
  'attachment.toolInputCopies'?: object; // present in 7430/2573425 samples
  'attachment.toolInputCopies.[]'?: object; // present in 7430/2573425 samples
  'attachment.toolInputCopies.[].copy'?: string; // present in 7430/2573425 samples
  'attachment.toolInputCopies.[].id'?: string; // present in 7430/2573425 samples
  'attachment.toolUseID'?: string; // present in 2025171/2573425 samples
  'attachment.tools'?: object; // present in 4147/2573425 samples
  'attachment.tools.[]'?: object; // present in 3756/2573425 samples
  'attachment.tools.[].description'?: string; // present in 3756/2573425 samples
  'attachment.tools.[].name'?: string; // present in 3756/2573425 samples
  'attachment.tools.[].schema'?: object; // present in 3756/2573425 samples
  'attachment.tools.[].schema.description'?: string; // present in 3756/2573425 samples
  'attachment.tools.[].schema.eager_input_streaming'?: boolean; // present in 3756/2573425 samples
  'attachment.tools.[].schema.input_schema'?: object; // present in 3756/2573425 samples
  'attachment.tools.[].schema.name'?: string; // present in 3756/2573425 samples
  'attachment.turnCount'?: number; // present in 276/2573425 samples
  'attachment.turnReminder'?: string; // present in 78630/2573425 samples
  'attachment.type': string;
  'attachment.url'?: object; // present in 3732/2573425 samples
  'attachment.usage'?: object; // present in 132/2573425 samples
  'attachment.usage.durationMs'?: number; // present in 132/2573425 samples
  'attachment.usage.toolUses'?: number; // present in 132/2573425 samples
  'attachment.usage.totalTokens'?: number; // present in 132/2573425 samples
  'attachment.wireHiddenNames'?: object; // present in 14702/2573425 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isSidechain: boolean;
  parentUuid: object | string;
  rendered?: object; // present in 285448/2573425 samples
  'rendered.[]'?: object; // present in 285448/2573425 samples
  'rendered.[].content'?: object | string; // present in 285448/2573425 samples
  'rendered.[].content.[]'?: object; // present in 356/2573425 samples
  'rendered.[].content.[].text'?: string; // present in 356/2573425 samples
  'rendered.[].content.[].type'?: string; // present in 356/2573425 samples
  renderedInHumanTurn?: object; // present in 1852/2573425 samples
  'renderedInHumanTurn.[]'?: object; // present in 1852/2573425 samples
  'renderedInHumanTurn.[].content'?: string; // present in 1852/2573425 samples
  sessionId: string;
  session_id?: string; // present in 19747/2573425 samples
  slug?: string; // present in 512671/2573425 samples
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
 * Transcript type `"cost-state"`. Observed 693 time(s), CLI "(unknown)".
 */
export interface CostState {
  hasUnknownModelCost: boolean;
  modelUsage: object;
  'modelUsage.[dynamic-key]'?: object; // present in 567/693 samples
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
 * Transcript type `"custom-title"`. Observed 29796 time(s), CLI "(unknown)".
 */
export interface CustomTitle {
  customTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"file-history-delta"`. Observed 8203 time(s), CLI "(unknown)".
 */
export interface FileHistoryDelta {
  backup: object;
  'backup.backupFileName': object | string;
  'backup.backupTime': string;
  'backup.realParentDir'?: string; // present in 8197/8203 samples
  'backup.version': number;
  messageId: string;
  snapshotMessageId: string;
  timestamp: string;
  trackingPath: string;
  type: string;
}

/**
 * Transcript type `"file-history-snapshot"`. Observed 12446 time(s), CLI "(unknown)".
 */
export interface FileHistorySnapshot {
  isSnapshotUpdate: boolean;
  messageId: string;
  snapshot: object;
  'snapshot.messageId': string;
  'snapshot.preCheckpoint'?: boolean; // present in 12/12446 samples
  'snapshot.timestamp': string;
  'snapshot.trackedFileBackups': object;
  'snapshot.trackedFileBackups.[dynamic-key]'?: object; // present in 5078/12446 samples
  type: string;
}

/**
 * Transcript type `"frame-link"`. Observed 771 time(s), CLI "(unknown)".
 */
export interface FrameLink {
  artifactCount?: number; // present in 761/771 samples
  frameUrl?: string; // present in 39/771 samples
  path?: string; // present in 39/771 samples
  sessionId: string;
  timestamp: string;
  title?: string; // present in 39/771 samples
  type: string;
}

/**
 * Transcript type `"last-prompt"`. Observed 94918 time(s), CLI "(unknown)".
 */
export interface LastPrompt {
  lastPrompt?: string; // present in 91441/94918 samples
  leafUuid: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"mode"`. Observed 14400 time(s), CLI "(unknown)".
 */
export interface Mode {
  mode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"permission-mode"`. Observed 2181 time(s), CLI "(unknown)".
 */
export interface PermissionMode {
  permissionMode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"pr-link"`. Observed 30705 time(s), CLI "(unknown)".
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
 * Transcript type `"queue-operation"`. Observed 74105 time(s), CLI "(unknown)".
 */
export interface QueueOperation {
  content?: string; // present in 35446/74105 samples
  operation: string;
  reason?: string; // present in 4825/74105 samples
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Transcript type `"relocated"`. Observed 13559 time(s), CLI "(unknown)".
 */
export interface Relocated {
  relocatedCwd: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"system:agents_killed"`. Observed 3 time(s), CLI "2.1.258–2.1.280".
 */
export interface SystemAgentsKilled {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  parentUuid: string;
  sessionId: string;
  slug?: string; // present in 1/3 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:api_error"`. Observed 1028 time(s), CLI "2.1.218–2.1.284".
 */
export interface SystemApiError {
  cwd: string;
  entrypoint: string;
  error: object;
  'error.connection': object;
  'error.connection.code'?: string; // present in 673/1028 samples
  'error.connection.isSSLError'?: boolean; // present in 673/1028 samples
  'error.connection.message'?: string; // present in 673/1028 samples
  'error.formatted': string;
  'error.isNetworkDown': boolean;
  'error.message': string;
  'error.noResponse'?: object; // present in 432/1028 samples
  'error.noResponse.retryWaitMs'?: number; // present in 2/1028 samples
  'error.noResponse.waitedMs'?: number; // present in 2/1028 samples
  'error.rateLimits': object;
  'error.requestId'?: string; // present in 329/1028 samples
  'error.status'?: number; // present in 332/1028 samples
  gitBranch: string;
  isSidechain: boolean;
  level: string;
  maxRetries: number;
  parentUuid: string;
  retryAttempt: number;
  retryInMs: number;
  sessionId: string;
  slug?: string; // present in 109/1028 samples
  source: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:away_summary"`. Observed 65 time(s), CLI "2.1.258–2.1.280".
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
  slug?: string; // present in 8/65 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:compact_boundary"`. Observed 94 time(s), CLI "2.1.220–2.1.282".
 */
export interface SystemCompactBoundary {
  agentId?: string; // present in 15/94 samples
  compactMetadata: object;
  'compactMetadata.cumulativeDroppedTokens': number;
  'compactMetadata.durationMs': number;
  'compactMetadata.postTokens': number;
  'compactMetadata.preCompactDiscoveredTools'?: object; // present in 85/94 samples
  'compactMetadata.preCompactDiscoveredTools.[]'?: string; // present in 85/94 samples
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
  isMeta?: boolean; // present in 43/94 samples
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
 * Transcript type `"system:informational"`. Observed 20 time(s), CLI "2.1.223–2.1.282".
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
  slug?: string; // present in 2/20 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:local_command"`. Observed 207 time(s), CLI "2.1.218–2.1.283".
 */
export interface SystemLocalCommand {
  commandRun?: object; // present in 30/207 samples
  'commandRun.args'?: string; // present in 30/207 samples
  'commandRun.command'?: string; // present in 30/207 samples
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  sessionId: string;
  slug?: string; // present in 24/207 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:model_refusal_fallback"`. Observed 24 time(s), CLI "2.1.261–2.1.282".
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
  'retractedMessageUuids.[]'?: string; // present in 8/24 samples
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
 * Transcript type `"system:stop_hook_summary"`. Observed 22955 time(s), CLI "2.1.215–2.1.284".
 */
export interface SystemStopHookSummary {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  hasOutput: boolean;
  hookAdditionalContext: object;
  hookCount: number;
  hookErrors: object;
  'hookErrors.[]'?: string; // present in 769/22955 samples
  hookInfos: object;
  'hookInfos.[]': object;
  'hookInfos.[].command': string;
  'hookInfos.[].durationMs': number;
  'hookInfos.[].promptText'?: string; // present in 417/22955 samples
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  preventedContinuation: boolean;
  sessionId: string;
  session_id?: string; // present in 405/22955 samples
  slug?: string; // present in 4839/22955 samples
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
 * Transcript type `"system:turn_duration"`. Observed 348 time(s), CLI "2.1.220–2.1.283".
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
  pendingBackgroundAgentCount?: number; // present in 121/348 samples
  sessionId: string;
  slug?: string; // present in 61/348 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"user"`. Observed 869570 time(s), CLI "2.1.215–2.1.284".
 */
export interface User {
  agentId?: string; // present in 611217/869570 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  imagePasteIds?: object; // present in 27/869570 samples
  'imagePasteIds.[]'?: number; // present in 27/869570 samples
  interruptedByShutdown?: boolean; // present in 709/869570 samples
  interruptedMessageId?: string; // present in 1/869570 samples
  isCompactSummary?: boolean; // present in 94/869570 samples
  isMeta?: boolean; // present in 17977/869570 samples
  isSidechain: boolean;
  isVisibleInTranscriptOnly?: boolean; // present in 94/869570 samples
  mcpMeta?: object; // present in 5925/869570 samples
  'mcpMeta._meta'?: object; // present in 1720/869570 samples
  'mcpMeta._meta.[dynamic-key]'?: object; // present in 1720/869570 samples
  'mcpMeta.structuredContent'?: object; // present in 4205/869570 samples
  'mcpMeta.structuredContent.[dynamic-key]'?: boolean | number | object | string; // present in 26732/869570 samples
  message: object;
  'message.content': object | string;
  'message.content.[]'?: object; // present in 817970/869570 samples
  'message.content.[].content'?: object | string; // present in 804933/869570 samples
  'message.content.[].content.[]'?: object; // present in 38866/869570 samples
  'message.content.[].is_error'?: boolean; // present in 446734/869570 samples
  'message.content.[].source'?: object; // present in 262/869570 samples
  'message.content.[].source.data'?: string; // present in 262/869570 samples
  'message.content.[].source.media_type'?: string; // present in 262/869570 samples
  'message.content.[].source.type'?: string; // present in 262/869570 samples
  'message.content.[].text'?: string; // present in 13036/869570 samples
  'message.content.[].title'?: string; // present in 15/869570 samples
  'message.content.[].tool_use_id'?: string; // present in 804933/869570 samples
  'message.content.[].type'?: string; // present in 817970/869570 samples
  'message.role': string;
  origin?: object; // present in 24510/869570 samples
  'origin.body'?: string; // present in 759/869570 samples
  'origin.from'?: string; // present in 759/869570 samples
  'origin.fromMode'?: string; // present in 6/869570 samples
  'origin.hopChain'?: object; // present in 1/869570 samples
  'origin.hopChain.[]'?: string; // present in 1/869570 samples
  'origin.kind'?: string; // present in 24510/869570 samples
  'origin.msg_id'?: string; // present in 6/869570 samples
  'origin.name'?: string; // present in 759/869570 samples
  'origin.producer'?: string; // present in 21/869570 samples
  'origin.senderTaskId'?: string; // present in 753/869570 samples
  'origin.verifiedPeerPid'?: number; // present in 6/869570 samples
  parentUuid: object | string;
  permissionMode?: string; // present in 26681/869570 samples
  promptId?: string; // present in 869475/869570 samples
  promptSource?: string; // present in 26683/869570 samples
  queuePriority?: string; // present in 2/869570 samples
  queueSkipAttachments?: boolean; // present in 8558/869570 samples
  queueTranscriptOnly?: boolean; // present in 3/869570 samples
  sessionId: string;
  session_id?: string; // present in 2668/869570 samples
  slug?: string; // present in 127967/869570 samples
  sourceToolAssistantUUID?: string; // present in 804933/869570 samples
  sourceToolUseID?: string; // present in 3642/869570 samples
  timestamp: string;
  toolDenialKind?: string; // present in 3042/869570 samples
  toolEndsTurn?: boolean; // present in 2148/869570 samples
  toolUseResult?: object | string; // present in 248110/869570 samples
  'toolUseResult.[]'?: object; // present in 2711/869570 samples
  'toolUseResult.[].description'?: string; // present in 1/869570 samples
  'toolUseResult.[].mimeType'?: string; // present in 1/869570 samples
  'toolUseResult.[].name'?: string; // present in 1/869570 samples
  'toolUseResult.[].server'?: string; // present in 1/869570 samples
  'toolUseResult.[].text'?: string; // present in 2710/869570 samples
  'toolUseResult.[].type'?: string; // present in 2710/869570 samples
  'toolUseResult.[].uri'?: string; // present in 1/869570 samples
  'toolUseResult.action'?: string; // present in 290/869570 samples
  'toolUseResult.agentId'?: string; // present in 17305/869570 samples
  'toolUseResult.agentType'?: string; // present in 5656/869570 samples
  'toolUseResult.agent_id'?: string; // present in 10/869570 samples
  'toolUseResult.agent_type'?: string; // present in 10/869570 samples
  'toolUseResult.allowedTools'?: object; // present in 71/869570 samples
  'toolUseResult.allowedTools.[]'?: string; // present in 71/869570 samples
  'toolUseResult.annotations'?: object; // present in 3/869570 samples
  'toolUseResult.answers'?: object; // present in 2210/869570 samples
  'toolUseResult.answers.[dynamic-key]'?: string; // present in 2210/869570 samples
  'toolUseResult.appliedLimit'?: number; // present in 699/869570 samples
  'toolUseResult.artifact_id'?: string; // present in 29/869570 samples
  'toolUseResult.artifacts'?: object; // present in 2/869570 samples
  'toolUseResult.artifacts.[]'?: object; // present in 2/869570 samples
  'toolUseResult.artifacts.[].[dynamic-key]'?: string; // present in 6/869570 samples
  'toolUseResult.audience'?: string; // present in 17/869570 samples
  'toolUseResult.backgroundCwdHint'?: string; // present in 229/869570 samples
  'toolUseResult.backgroundTaskId'?: string; // present in 5625/869570 samples
  'toolUseResult.bashEditDiff'?: object; // present in 983/869570 samples
  'toolUseResult.bashEditDiff.changedFiles'?: object; // present in 450/869570 samples
  'toolUseResult.bashEditDiff.changedFiles.[]'?: string; // present in 450/869570 samples
  'toolUseResult.bashEditDiff.files'?: object; // present in 983/869570 samples
  'toolUseResult.bashEditDiff.files.[]'?: object; // present in 418/869570 samples
  'toolUseResult.bashEditDiff.files.[].created'?: boolean; // present in 117/869570 samples
  'toolUseResult.bashEditDiff.files.[].deleted'?: boolean; // present in 39/869570 samples
  'toolUseResult.bashEditDiff.files.[].filePath'?: string; // present in 418/869570 samples
  'toolUseResult.bashEditDiff.files.[].hunks'?: object; // present in 418/869570 samples
  'toolUseResult.bashEditDiff.moreFiles'?: number; // present in 983/869570 samples
  'toolUseResult.bashEditDiff.shared'?: boolean; // present in 429/869570 samples
  'toolUseResult.bashEditDiff.unavailable'?: boolean; // present in 166/869570 samples
  'toolUseResult.bytes'?: number; // present in 201/869570 samples
  'toolUseResult.canReadOutputFile'?: boolean; // present in 11559/869570 samples
  'toolUseResult.cancelledWakeups'?: number; // present in 88/869570 samples
  'toolUseResult.clampedDelaySeconds'?: number; // present in 278/869570 samples
  'toolUseResult.code'?: number; // present in 201/869570 samples
  'toolUseResult.codeText'?: string; // present in 201/869570 samples
  'toolUseResult.color'?: string; // present in 10/869570 samples
  'toolUseResult.command'?: string; // present in 180/869570 samples
  'toolUseResult.commandName'?: string; // present in 1981/869570 samples
  'toolUseResult.content'?: object | string; // present in 17535/869570 samples
  'toolUseResult.content.[]'?: object; // present in 5656/869570 samples
  'toolUseResult.content.[].text'?: string; // present in 5656/869570 samples
  'toolUseResult.content.[].type'?: string; // present in 5656/869570 samples
  'toolUseResult.contentNotInModelContext'?: boolean; // present in 114/869570 samples
  'toolUseResult.contract'?: string; // present in 17/869570 samples
  'toolUseResult.countIsComplete'?: boolean; // present in 1305/869570 samples
  'toolUseResult.dangerouslyDisableSandbox'?: boolean; // present in 30/869570 samples
  'toolUseResult.description'?: string; // present in 11559/869570 samples
  'toolUseResult.disabledReason'?: string; // present in 11/869570 samples
  'toolUseResult.discardedCommits'?: number; // present in 46/869570 samples
  'toolUseResult.discardedFiles'?: number; // present in 46/869570 samples
  'toolUseResult.display'?: string; // present in 23/869570 samples
  'toolUseResult.durable'?: boolean; // present in 2/869570 samples
  'toolUseResult.durationMs'?: number; // present in 1506/869570 samples
  'toolUseResult.durationSeconds'?: number; // present in 126/869570 samples
  'toolUseResult.failed_mcp_servers'?: object; // present in 9/869570 samples
  'toolUseResult.failed_mcp_servers.[]'?: object; // present in 9/869570 samples
  'toolUseResult.failed_mcp_servers.[].error'?: string; // present in 9/869570 samples
  'toolUseResult.failed_mcp_servers.[].errorCode'?: string; // present in 9/869570 samples
  'toolUseResult.failed_mcp_servers.[].name'?: string; // present in 9/869570 samples
  'toolUseResult.file'?: object; // present in 31865/869570 samples
  'toolUseResult.file.base64'?: string; // present in 152/869570 samples
  'toolUseResult.file.content'?: string; // present in 31699/869570 samples
  'toolUseResult.file.dimensions'?: object; // present in 152/869570 samples
  'toolUseResult.file.dimensions.displayHeight'?: number; // present in 152/869570 samples
  'toolUseResult.file.dimensions.displayWidth'?: number; // present in 152/869570 samples
  'toolUseResult.file.dimensions.originalHeight'?: number; // present in 152/869570 samples
  'toolUseResult.file.dimensions.originalWidth'?: number; // present in 152/869570 samples
  'toolUseResult.file.filePath'?: string; // present in 31713/869570 samples
  'toolUseResult.file.numLines'?: number; // present in 31699/869570 samples
  'toolUseResult.file.originalSize'?: number; // present in 152/869570 samples
  'toolUseResult.file.startLine'?: number; // present in 31699/869570 samples
  'toolUseResult.file.totalLines'?: number; // present in 31699/869570 samples
  'toolUseResult.file.truncatedByTokenCap'?: boolean; // present in 85/869570 samples
  'toolUseResult.file.type'?: string; // present in 152/869570 samples
  'toolUseResult.fileCount'?: number; // present in 46/869570 samples
  'toolUseResult.filePath'?: string; // present in 15777/869570 samples
  'toolUseResult.filenames'?: object; // present in 9923/869570 samples
  'toolUseResult.filenames.[]'?: string; // present in 4615/869570 samples
  'toolUseResult.gitOperation'?: object; // present in 6132/869570 samples
  'toolUseResult.gitOperation.branch'?: object; // present in 367/869570 samples
  'toolUseResult.gitOperation.branch.action'?: string; // present in 367/869570 samples
  'toolUseResult.gitOperation.branch.ref'?: string; // present in 367/869570 samples
  'toolUseResult.gitOperation.commit'?: object; // present in 2466/869570 samples
  'toolUseResult.gitOperation.commit.branch'?: string; // present in 1740/869570 samples
  'toolUseResult.gitOperation.commit.kind'?: string; // present in 2466/869570 samples
  'toolUseResult.gitOperation.commit.sha'?: string; // present in 2466/869570 samples
  'toolUseResult.gitOperation.pr'?: object; // present in 1591/869570 samples
  'toolUseResult.gitOperation.pr.action'?: string; // present in 1591/869570 samples
  'toolUseResult.gitOperation.pr.number'?: number; // present in 1591/869570 samples
  'toolUseResult.gitOperation.pr.url'?: string; // present in 1320/869570 samples
  'toolUseResult.gitOperation.push'?: object; // present in 1853/869570 samples
  'toolUseResult.gitOperation.push.branch'?: string; // present in 1853/869570 samples
  'toolUseResult.harnessNoteCount'?: number; // present in 2649/869570 samples
  'toolUseResult.harnessSectionHash'?: string; // present in 2649/869570 samples
  'toolUseResult.harnessTailCount'?: number; // present in 2649/869570 samples
  'toolUseResult.humanSchedule'?: string; // present in 2/869570 samples
  'toolUseResult.icon'?: string; // present in 1/869570 samples
  'toolUseResult.id'?: string; // present in 2/869570 samples
  'toolUseResult.interrupted'?: boolean; // present in 111353/869570 samples
  'toolUseResult.isAsync'?: boolean; // present in 11559/869570 samples
  'toolUseResult.isImage'?: boolean; // present in 111353/869570 samples
  'toolUseResult.is_splitpane'?: boolean; // present in 10/869570 samples
  'toolUseResult.listing'?: string; // present in 7393/869570 samples
  'toolUseResult.liveSubscription'?: string; // present in 39/869570 samples
  'toolUseResult.localSent'?: boolean; // present in 11/869570 samples
  'toolUseResult.matches'?: object; // present in 3020/869570 samples
  'toolUseResult.matches.[]'?: string; // present in 2984/869570 samples
  'toolUseResult.memdirStamped'?: boolean; // present in 42/869570 samples
  'toolUseResult.message'?: string; // present in 2863/869570 samples
  'toolUseResult.mode'?: string; // present in 8618/869570 samples
  'toolUseResult.model'?: string; // present in 187/869570 samples
  'toolUseResult.msg_id'?: string; // present in 43/869570 samples
  'toolUseResult.name'?: string; // present in 10/869570 samples
  'toolUseResult.newString'?: string; // present in 8810/869570 samples
  'toolUseResult.newTodos'?: object; // present in 2610/869570 samples
  'toolUseResult.newTodos.[]'?: object; // present in 2610/869570 samples
  'toolUseResult.newTodos.[].activeForm'?: string; // present in 2610/869570 samples
  'toolUseResult.newTodos.[].content'?: string; // present in 2610/869570 samples
  'toolUseResult.newTodos.[].status'?: string; // present in 2610/869570 samples
  'toolUseResult.noOutputExpected'?: boolean; // present in 111353/869570 samples
  'toolUseResult.numFiles'?: number; // present in 9923/869570 samples
  'toolUseResult.numLines'?: number; // present in 4939/869570 samples
  'toolUseResult.numMatches'?: number; // present in 21/869570 samples
  'toolUseResult.oldString'?: string; // present in 8810/869570 samples
  'toolUseResult.oldTodos'?: object; // present in 2610/869570 samples
  'toolUseResult.oldTodos.[]'?: object; // present in 2209/869570 samples
  'toolUseResult.oldTodos.[].activeForm'?: string; // present in 2209/869570 samples
  'toolUseResult.oldTodos.[].content'?: string; // present in 2209/869570 samples
  'toolUseResult.oldTodos.[].status'?: string; // present in 2209/869570 samples
  'toolUseResult.operation'?: string; // present in 48/869570 samples
  'toolUseResult.originalCwd'?: string; // present in 290/869570 samples
  'toolUseResult.originalCwdMissing'?: boolean; // present in 10/869570 samples
  'toolUseResult.originalFile'?: object | string; // present in 15729/869570 samples
  'toolUseResult.outputFile'?: string; // present in 11559/869570 samples
  'toolUseResult.path'?: string; // present in 39/869570 samples
  'toolUseResult.persistedOutputPath'?: string; // present in 419/869570 samples
  'toolUseResult.persistedOutputSize'?: number; // present in 419/869570 samples
  'toolUseResult.persistent'?: boolean; // present in 197/869570 samples
  'toolUseResult.pin'?: object; // present in 1929/869570 samples
  'toolUseResult.pin.id'?: string; // present in 1929/869570 samples
  'toolUseResult.pin.name'?: string; // present in 1929/869570 samples
  'toolUseResult.pin.ref'?: string; // present in 1929/869570 samples
  'toolUseResult.plan_mode_required'?: boolean; // present in 10/869570 samples
  'toolUseResult.prompt'?: string; // present in 17225/869570 samples
  'toolUseResult.pushSent'?: boolean; // present in 11/869570 samples
  'toolUseResult.query'?: string; // present in 3146/869570 samples
  'toolUseResult.questions'?: object; // present in 2210/869570 samples
  'toolUseResult.questions.[]'?: object; // present in 2210/869570 samples
  'toolUseResult.questions.[].header'?: string; // present in 2210/869570 samples
  'toolUseResult.questions.[].multiSelect'?: boolean; // present in 2210/869570 samples
  'toolUseResult.questions.[].options'?: object; // present in 2210/869570 samples
  'toolUseResult.questions.[].options.[]'?: object; // present in 2210/869570 samples
  'toolUseResult.questions.[].question'?: string; // present in 2210/869570 samples
  'toolUseResult.quickstart'?: object; // present in 1/869570 samples
  'toolUseResult.quickstart.design_guidance'?: boolean; // present in 1/869570 samples
  'toolUseResult.quickstart.intent'?: string; // present in 1/869570 samples
  'toolUseResult.quickstart.types_hooked'?: boolean; // present in 1/869570 samples
  'toolUseResult.quickstart.types_note'?: string; // present in 1/869570 samples
  'toolUseResult.recurring'?: boolean; // present in 2/869570 samples
  'toolUseResult.replaceAll'?: boolean; // present in 8810/869570 samples
  'toolUseResult.resolvedModel'?: string; // present in 17215/869570 samples
  'toolUseResult.restoredCwd'?: string; // present in 10/869570 samples
  'toolUseResult.result'?: string; // present in 339/869570 samples
  'toolUseResult.resultCount'?: number; // present in 46/869570 samples
  'toolUseResult.results'?: object; // present in 126/869570 samples
  'toolUseResult.results.[]'?: object | string; // present in 126/869570 samples
  'toolUseResult.results.[].content'?: object; // present in 126/869570 samples
  'toolUseResult.results.[].content.[]'?: object; // present in 126/869570 samples
  'toolUseResult.results.[].tool_use_id'?: string; // present in 126/869570 samples
  'toolUseResult.resumedAgentId'?: string; // present in 1330/869570 samples
  'toolUseResult.retrieval_status'?: string; // present in 159/869570 samples
  'toolUseResult.returnCodeInterpretation'?: string; // present in 277/869570 samples
  'toolUseResult.routing'?: object; // present in 24/869570 samples
  'toolUseResult.routing.content'?: string; // present in 24/869570 samples
  'toolUseResult.routing.sender'?: string; // present in 24/869570 samples
  'toolUseResult.routing.senderColor'?: string; // present in 22/869570 samples
  'toolUseResult.routing.summary'?: string; // present in 24/869570 samples
  'toolUseResult.routing.target'?: string; // present in 24/869570 samples
  'toolUseResult.routing.targetColor'?: string; // present in 24/869570 samples
  'toolUseResult.runId'?: string; // present in 3/869570 samples
  'toolUseResult.scheduledFor'?: number; // present in 278/869570 samples
  'toolUseResult.scriptPath'?: string; // present in 3/869570 samples
  'toolUseResult.searchCount'?: number; // present in 126/869570 samples
  'toolUseResult.sentAt'?: string; // present in 11/869570 samples
  'toolUseResult.seq'?: number; // present in 1/869570 samples
  'toolUseResult.staleReadFileStateHint'?: string; // present in 141/869570 samples
  'toolUseResult.staleRecovered'?: boolean; // present in 95/869570 samples
  'toolUseResult.status'?: string; // present in 17318/869570 samples
  'toolUseResult.stderr'?: string; // present in 111353/869570 samples
  'toolUseResult.stdout'?: string; // present in 111353/869570 samples
  'toolUseResult.stopped'?: boolean; // present in 88/869570 samples
  'toolUseResult.structuredPatch'?: object; // present in 15729/869570 samples
  'toolUseResult.structuredPatch.[]'?: object; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].lines'?: object; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].lines.[]'?: string; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].newLines'?: number; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].newStart'?: number; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].oldLines'?: number; // present in 9482/869570 samples
  'toolUseResult.structuredPatch.[].oldStart'?: number; // present in 9482/869570 samples
  'toolUseResult.success'?: boolean; // present in 3963/869570 samples
  'toolUseResult.summary'?: string; // present in 3/869570 samples
  'toolUseResult.task'?: object; // present in 159/869570 samples
  'toolUseResult.task.description'?: string; // present in 159/869570 samples
  'toolUseResult.task.exitCode'?: number | object; // present in 52/869570 samples
  'toolUseResult.task.isRawTranscript'?: boolean; // present in 107/869570 samples
  'toolUseResult.task.output'?: string; // present in 159/869570 samples
  'toolUseResult.task.prompt'?: string; // present in 107/869570 samples
  'toolUseResult.task.result'?: string; // present in 107/869570 samples
  'toolUseResult.task.status'?: string; // present in 159/869570 samples
  'toolUseResult.task.task_id'?: string; // present in 159/869570 samples
  'toolUseResult.task.task_type'?: string; // present in 159/869570 samples
  'toolUseResult.taskId'?: string; // present in 200/869570 samples
  'toolUseResult.taskType'?: string; // present in 3/869570 samples
  'toolUseResult.task_id'?: string; // present in 180/869570 samples
  'toolUseResult.task_type'?: string; // present in 180/869570 samples
  'toolUseResult.tasks'?: object; // present in 2/869570 samples
  'toolUseResult.team_name'?: string; // present in 10/869570 samples
  'toolUseResult.teammate_id'?: string; // present in 10/869570 samples
  'toolUseResult.timedOutAfterMs'?: number; // present in 322/869570 samples
  'toolUseResult.timeoutMs'?: number; // present in 197/869570 samples
  'toolUseResult.title'?: string; // present in 39/869570 samples
  'toolUseResult.tmux_pane_id'?: string; // present in 10/869570 samples
  'toolUseResult.tmux_session_name'?: string; // present in 10/869570 samples
  'toolUseResult.tmux_window_name'?: string; // present in 10/869570 samples
  'toolUseResult.toolStats'?: object; // present in 5638/869570 samples
  'toolUseResult.toolStats.bashCount'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.editFileCount'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.linesAdded'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.linesRemoved'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.otherToolCount'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.readCount'?: number; // present in 5638/869570 samples
  'toolUseResult.toolStats.searchCount'?: number; // present in 5638/869570 samples
  'toolUseResult.totalDurationMs'?: number; // present in 5656/869570 samples
  'toolUseResult.totalFiles'?: number; // present in 3658/869570 samples
  'toolUseResult.totalLines'?: number; // present in 4939/869570 samples
  'toolUseResult.totalMatches'?: number; // present in 1305/869570 samples
  'toolUseResult.totalTokens'?: number; // present in 5656/869570 samples
  'toolUseResult.totalToolUseCount'?: number; // present in 5656/869570 samples
  'toolUseResult.total_deferred_tools'?: number; // present in 3020/869570 samples
  'toolUseResult.transcriptDir'?: string; // present in 3/869570 samples
  'toolUseResult.truncated'?: boolean; // present in 1307/869570 samples
  'toolUseResult.type'?: string; // present in 38784/869570 samples
  'toolUseResult.updated'?: boolean; // present in 39/869570 samples
  'toolUseResult.url'?: string; // present in 240/869570 samples
  'toolUseResult.usage'?: object; // present in 5656/869570 samples
  'toolUseResult.usage.cache_creation'?: object; // present in 5656/869570 samples
  'toolUseResult.usage.cache_creation.ephemeral_1h_input_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.cache_creation.ephemeral_5m_input_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.cache_creation_input_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.cache_read_input_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.inference_geo'?: string; // present in 5656/869570 samples
  'toolUseResult.usage.input_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.iterations'?: object; // present in 5656/869570 samples
  'toolUseResult.usage.iterations.[]'?: object; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].cache_creation'?: object; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].cache_read_input_tokens'?: number; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].input_tokens'?: number; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].output_tokens'?: number; // present in 5651/869570 samples
  'toolUseResult.usage.iterations.[].type'?: string; // present in 5651/869570 samples
  'toolUseResult.usage.output_tokens'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.output_tokens_details'?: object; // present in 3528/869570 samples
  'toolUseResult.usage.output_tokens_details.thinking_tokens'?: number; // present in 3528/869570 samples
  'toolUseResult.usage.server_tool_use'?: object; // present in 5656/869570 samples
  'toolUseResult.usage.server_tool_use.web_fetch_requests'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.server_tool_use.web_search_requests'?: number; // present in 5656/869570 samples
  'toolUseResult.usage.service_tier'?: string; // present in 5656/869570 samples
  'toolUseResult.usage.speed'?: string; // present in 5656/869570 samples
  'toolUseResult.userModified'?: boolean; // present in 15729/869570 samples
  'toolUseResult.version'?: string; // present in 39/869570 samples
  'toolUseResult.wasClamped'?: boolean; // present in 278/869570 samples
  'toolUseResult.workflowName'?: string; // present in 3/869570 samples
  'toolUseResult.worktreeBranch'?: string; // present in 190/869570 samples
  'toolUseResult.worktreePath'?: string; // present in 692/869570 samples
  turnCompanion?: boolean; // present in 3103/869570 samples
  turnOrigin?: string; // present in 3149/869570 samples
  turnPosition?: object; // present in 26/869570 samples
  'turnPosition.promptIndex'?: number; // present in 26/869570 samples
  'turnPosition.turnIndex'?: number; // present in 26/869570 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"worktree-state"`. Observed 40196 time(s), CLI "(unknown)".
 */
export interface WorktreeState {
  sessionId: string;
  type: string;
  worktreeSession: object;
  'worktreeSession.enteredExisting'?: boolean; // present in 10888/40196 samples
  'worktreeSession.hookBased'?: boolean; // present in 26368/40196 samples
  'worktreeSession.originalBranch'?: string; // present in 190/40196 samples
  'worktreeSession.originalCwd'?: string; // present in 37446/40196 samples
  'worktreeSession.originalHeadCommit'?: string; // present in 190/40196 samples
  'worktreeSession.preEnterOriginalCwd'?: string; // present in 37446/40196 samples
  'worktreeSession.sessionId'?: string; // present in 37446/40196 samples
  'worktreeSession.worktreeBranch'?: string; // present in 11078/40196 samples
  'worktreeSession.worktreeName'?: string; // present in 37446/40196 samples
  'worktreeSession.worktreePath'?: string; // present in 37446/40196 samples
}
