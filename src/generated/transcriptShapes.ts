/**
 * AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, not a runtime contract, do not hand-edit, do not import from runtime parsing code.
 *
 * Generated: 2026-08-22T22:41:12.041Z
 * CLI versions observed: "2.1.215", "2.1.218", "2.1.219", "2.1.220", "2.1.221", "2.1.222", "2.1.223", "2.1.224", "2.1.226", "2.1.227", "2.1.228", "2.1.229", "2.1.231", "2.1.232", "2.1.233", "2.1.234", "2.1.235", "2.1.237", "2.1.238", "2.1.239", "2.1.240"
 *
 * Rendered from scripts/schema-gen/schema-observations.json by generateTsReference.ts (T9,
 * see transcript-schema-gen.md). Each interface below is one observed transcript `type` (or
 * `type:subtype`) bucket; each property is the exact dotted field path recorded by
 * schemaAggregator.ts (`[]` marks a collapsed array segment), typed as the union of JS
 * `typeof` values actually observed. A trailing `?` plus a presence-count comment means the
 * field was not present on every sampled line of that bucket.
 */

/**
 * Transcript type `"agent-name"`. Observed 5886 time(s), CLI "(unknown)".
 */
export interface AgentName {
  agentName: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"ai-title"`. Observed 14033 time(s), CLI "(unknown)".
 */
export interface AiTitle {
  aiTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"artifact-autoreact-ledger"`. Observed 21 time(s), CLI "(unknown)".
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
 * Transcript type `"artifact-comment-monitor"`. Observed 4 time(s), CLI "(unknown)".
 */
export interface ArtifactCommentMonitor {
  artifacts: object;
  'artifacts.[dynamic-key]': object;
  sessionId: string;
  type: string;
  v: number;
}

/**
 * Transcript type `"assistant"`. Observed 332252 time(s), CLI "2.1.215–2.1.240".
 */
export interface Assistant {
  agentId?: string; // present in 231185/332252 samples
  apiError?: string; // present in 1/332252 samples
  apiErrorStatus?: number; // present in 32/332252 samples
  attributionAgent?: string; // present in 229515/332252 samples
  attributionMcpServer?: string; // present in 8191/332252 samples
  attributionMcpTool?: string; // present in 8191/332252 samples
  attributionPlugin?: string; // present in 54206/332252 samples
  attributionSkill?: string; // present in 108529/332252 samples
  cwd: string;
  effort?: string; // present in 311542/332252 samples
  entrypoint: string;
  error?: string; // present in 60/332252 samples
  errorDetails?: string; // present in 1/332252 samples
  gitBranch: string;
  isAbortedMidStream?: boolean; // present in 19/332252 samples
  isApiErrorMessage?: boolean; // present in 71/332252 samples
  isSidechain: boolean;
  message: object;
  'message.container'?: object; // present in 71/332252 samples
  'message.content': object;
  'message.content.[]': object;
  'message.content.[].caller'?: object; // present in 182439/332252 samples
  'message.content.[].caller.type'?: string; // present in 182439/332252 samples
  'message.content.[].id'?: string; // present in 182439/332252 samples
  'message.content.[].input'?: object; // present in 182439/332252 samples
  'message.content.[].input.[dynamic-key]'?: boolean | number | string; // present in 1112/332252 samples
  'message.content.[].input.__unparsedToolInput'?: object; // present in 23/332252 samples
  'message.content.[].input.action'?: string; // present in 71/332252 samples
  'message.content.[].input.allowed_domains'?: object; // present in 2/332252 samples
  'message.content.[].input.args'?: string; // present in 337/332252 samples
  'message.content.[].input.base'?: string; // present in 147/332252 samples
  'message.content.[].input.block'?: boolean | string; // present in 77/332252 samples
  'message.content.[].input.changed_files'?: object; // present in 27/332252 samples
  'message.content.[].input.character'?: number; // present in 24/332252 samples
  'message.content.[].input.code'?: string; // present in 10/332252 samples
  'message.content.[].input.command'?: string; // present in 97530/332252 samples
  'message.content.[].input.content'?: string; // present in 4442/332252 samples
  'message.content.[].input.context7CompatibleLibraryID'?: string; // present in 4/332252 samples
  'message.content.[].input.context_length'?: number; // present in 436/332252 samples
  'message.content.[].input.create_if_missing'?: boolean; // present in 6/332252 samples
  'message.content.[].input.create_if_not_exists'?: boolean; // present in 3/332252 samples
  'message.content.[].input.create_placeholder'?: boolean; // present in 1/332252 samples
  'message.content.[].input.dangerouslyDisableSandbox'?: boolean; // present in 38/332252 samples
  'message.content.[].input.date_type'?: string; // present in 1/332252 samples
  'message.content.[].input.days_ago'?: number; // present in 1/332252 samples
  'message.content.[].input.delaySeconds'?: number; // present in 97/332252 samples
  'message.content.[].input.deploymentId'?: string; // present in 34/332252 samples
  'message.content.[].input.descriptio'?: string; // present in 1/332252 samples
  'message.content.[].input.description'?: string; // present in 90376/332252 samples
  'message.content.[].input.destination_path'?: string; // present in 11/332252 samples
  'message.content.[].input.detail_level'?: string; // present in 76/332252 samples
  'message.content.[].input.direction'?: string; // present in 4/332252 samples
  'message.content.[].input.directory'?: object | string; // present in 16/332252 samples
  'message.content.[].input.discard_changes'?: boolean; // present in 7/332252 samples
  'message.content.[].input.end_time'?: string; // present in 1/332252 samples
  'message.content.[].input.environment'?: string; // present in 56/332252 samples
  'message.content.[].input.favicon'?: string; // present in 9/332252 samples
  'message.content.[].input.filePath'?: string; // present in 24/332252 samples
  'message.content.[].input.file_path'?: string; // present in 68551/332252 samples
  'message.content.[].input.file_path_pattern'?: string; // present in 9/332252 samples
  'message.content.[].input.findings'?: object; // present in 603/332252 samples
  'message.content.[].input.folder_path'?: string; // present in 1/332252 samples
  'message.content.[].input.full_rebuild'?: boolean; // present in 4/332252 samples
  'message.content.[].input.function_name'?: string; // present in 1/332252 samples
  'message.content.[].input.glob'?: string; // present in 115/332252 samples
  'message.content.[].input.group_by'?: string; // present in 21/332252 samples
  'message.content.[].input.head_limit'?: number | string; // present in 355/332252 samples
  'message.content.[].input.idOrUrl'?: string; // present in 11/332252 samples
  'message.content.[].input.include_source'?: boolean; // present in 24/332252 samples
  'message.content.[].input.isolation'?: string; // present in 1/332252 samples
  'message.content.[].input.kind'?: string; // present in 34/332252 samples
  'message.content.[].input.label'?: string; // present in 3/332252 samples
  'message.content.[].input.level'?: object | string; // present in 14/332252 samples
  'message.content.[].input.libraryId'?: string; // present in 119/332252 samples
  'message.content.[].input.libraryName'?: string; // present in 57/332252 samples
  'message.content.[].input.limit'?: number; // present in 9844/332252 samples
  'message.content.[].input.line'?: number; // present in 24/332252 samples
  'message.content.[].input.maxFieldLength'?: number; // present in 5/332252 samples
  'message.content.[].input.max_depth'?: number; // present in 65/332252 samples
  'message.content.[].input.max_results'?: number; // present in 1550/332252 samples
  'message.content.[].input.merge_strategy'?: string; // present in 4/332252 samples
  'message.content.[].input.message'?: string; // present in 709/332252 samples
  'message.content.[].input.min_lines'?: number; // present in 34/332252 samples
  'message.content.[].input.mode'?: string; // present in 4/332252 samples
  'message.content.[].input.model'?: string; // present in 3924/332252 samples
  'message.content.[].input.name'?: string; // present in 2320/332252 samples
  'message.content.[].input.new_new_string_PLACEHOLDER'?: string; // present in 1/332252 samples
  'message.content.[].input.new_new_string_placeholder'?: string; // present in 1/332252 samples
  'message.content.[].input.new_string'?: string; // present in 14107/332252 samples
  'message.content.[].input.noop'?: boolean; // present in 60/332252 samples
  'message.content.[].input.offset'?: number | object; // present in 8220/332252 samples
  'message.content.[].input.old_string'?: string; // present in 14109/332252 samples
  'message.content.[].input.old_string_2'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_alt'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_confidence'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_new_string_separator'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_occurrence'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_occurrence_index'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_replace_all'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_should_exist_check'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_should_exist_exactly_once'?: string; // present in 1/332252 samples
  'message.content.[].input.old_string_should_exist_once'?: string; // present in 1/332252 samples
  'message.content.[].input.operation'?: string; // present in 51/332252 samples
  'message.content.[].input.operator'?: string; // present in 1/332252 samples
  'message.content.[].input.output_mode'?: string; // present in 2292/332252 samples
  'message.content.[].input.pageSize'?: number; // present in 2/332252 samples
  'message.content.[].input.path'?: string; // present in 1949/332252 samples
  'message.content.[].input.pattern'?: string; // present in 2811/332252 samples
  'message.content.[].input.period'?: number | string; // present in 10/332252 samples
  'message.content.[].input.persistent'?: boolean; // present in 82/332252 samples
  'message.content.[].input.postprocess'?: string; // present in 38/332252 samples
  'message.content.[].input.projectId'?: string; // present in 179/332252 samples
  'message.content.[].input.project_name'?: string; // present in 1/332252 samples
  'message.content.[].input.prompt'?: string; // present in 4760/332252 samples
  'message.content.[].input.query'?: string; // present in 2468/332252 samples
  'message.content.[].input.questions'?: object; // present in 719/332252 samples
  'message.content.[].input.reason'?: string; // present in 97/332252 samples
  'message.content.[].input.recipient'?: string; // present in 704/332252 samples
  'message.content.[].input.recursive'?: boolean; // present in 19/332252 samples
  'message.content.[].input.refuted'?: object; // present in 1/332252 samples
  'message.content.[].input.region'?: string; // present in 1/332252 samples
  'message.content.[].input.registries'?: object; // present in 1/332252 samples
  'message.content.[].input.replace_all'?: boolean; // present in 14098/332252 samples
  'message.content.[].input.repo_root'?: string; // present in 251/332252 samples
  'message.content.[].input.requestPath'?: string; // present in 1/332252 samples
  'message.content.[].input.resources'?: object; // present in 1/332252 samples
  'message.content.[].input.routes'?: string; // present in 4/332252 samples
  'message.content.[].input.runId'?: string; // present in 7/332252 samples
  'message.content.[].input.run_in_background'?: boolean; // present in 3257/332252 samples
  'message.content.[].input.scope'?: string; // present in 1/332252 samples
  'message.content.[].input.section_identifier'?: string; // present in 27/332252 samples
  'message.content.[].input.server'?: string; // present in 1/332252 samples
  'message.content.[].input.since'?: number | string; // present in 146/332252 samples
  'message.content.[].input.skill'?: string; // present in 776/332252 samples
  'message.content.[].input.sort_by'?: string; // present in 1/332252 samples
  'message.content.[].input.source_path'?: string; // present in 11/332252 samples
  'message.content.[].input.start_time'?: string; // present in 1/332252 samples
  'message.content.[].input.status'?: string; // present in 5/332252 samples
  'message.content.[].input.statusCode'?: string; // present in 13/332252 samples
  'message.content.[].input.stop'?: boolean; // present in 30/332252 samples
  'message.content.[].input.subagent_type'?: string; // present in 4072/332252 samples
  'message.content.[].input.summary'?: string; // present in 695/332252 samples
  'message.content.[].input.survived'?: object; // present in 1/332252 samples
  'message.content.[].input.tags'?: object; // present in 1/332252 samples
  'message.content.[].input.target'?: string; // present in 6/332252 samples
  'message.content.[].input.task'?: string; // present in 5/332252 samples
  'message.content.[].input.task_id'?: string; // present in 143/332252 samples
  'message.content.[].input.teamId'?: string; // present in 195/332252 samples
  'message.content.[].input.timeout'?: number | string; // present in 7983/332252 samples
  'message.content.[].input.timeout_ms'?: number | string; // present in 88/332252 samples
  'message.content.[].input.title'?: string; // present in 3/332252 samples
  'message.content.[].input.to'?: string; // present in 707/332252 samples
  'message.content.[].input.todos'?: object; // present in 1634/332252 samples
  'message.content.[].input.tokens'?: number; // present in 20/332252 samples
  'message.content.[].input.topic'?: string; // present in 44/332252 samples
  'message.content.[].input.type'?: string; // present in 705/332252 samples
  'message.content.[].input.until'?: string; // present in 50/332252 samples
  'message.content.[].input.update_links'?: boolean; // present in 2/332252 samples
  'message.content.[].input.url'?: string; // present in 553/332252 samples
  'message.content.[].name'?: string; // present in 182439/332252 samples
  'message.content.[].signature'?: string; // present in 102817/332252 samples
  'message.content.[].text'?: string; // present in 47008/332252 samples
  'message.content.[].thinking'?: string; // present in 102817/332252 samples
  'message.content.[].type': string;
  'message.context_management'?: object; // present in 84/332252 samples
  'message.context_management.applied_edits'?: object; // present in 13/332252 samples
  'message.diagnostics'?: object; // present in 332211/332252 samples
  'message.diagnostics.cache_miss_reason'?: object; // present in 5275/332252 samples
  'message.diagnostics.cache_miss_reason.cache_missed_input_tokens'?: number; // present in 4275/332252 samples
  'message.diagnostics.cache_miss_reason.type'?: string; // present in 5275/332252 samples
  'message.id': string;
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
  'message.usage.iterations'?: object; // present in 178541/332252 samples
  'message.usage.iterations.[]'?: object; // present in 178442/332252 samples
  'message.usage.iterations.[].cache_creation'?: object; // present in 178442/332252 samples
  'message.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 178442/332252 samples
  'message.usage.iterations.[].cache_read_input_tokens'?: number; // present in 178442/332252 samples
  'message.usage.iterations.[].input_tokens'?: number; // present in 178442/332252 samples
  'message.usage.iterations.[].output_tokens'?: number; // present in 178442/332252 samples
  'message.usage.iterations.[].type'?: string; // present in 178442/332252 samples
  'message.usage.output_tokens': number;
  'message.usage.output_tokens_details'?: object; // present in 81401/332252 samples
  'message.usage.output_tokens_details.thinking_tokens'?: number; // present in 81371/332252 samples
  'message.usage.server_tool_use'?: object; // present in 178541/332252 samples
  'message.usage.server_tool_use.web_fetch_requests'?: number; // present in 178541/332252 samples
  'message.usage.server_tool_use.web_search_requests'?: number; // present in 178541/332252 samples
  'message.usage.service_tier': object | string;
  'message.usage.speed'?: object | string; // present in 178541/332252 samples
  parentUuid: string;
  requestId?: string; // present in 332213/332252 samples
  sessionId: string;
  session_id?: string; // present in 207/332252 samples
  slug?: string; // present in 28041/332252 samples
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"atis-latch"`. Observed 1446 time(s), CLI "(unknown)".
 */
export interface AtisLatch {
  atis: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"attachment"`. Observed 212382 time(s), CLI "2.1.215–2.1.240".
 */
export interface Attachment {
  agentId?: string; // present in 18774/212382 samples
  attachment: object;
  'attachment.addedBlocks'?: object; // present in 505/212382 samples
  'attachment.addedBlocks.[]'?: string; // present in 489/212382 samples
  'attachment.addedLines'?: object; // present in 6806/212382 samples
  'attachment.addedLines.[]'?: string; // present in 6683/212382 samples
  'attachment.addedNames'?: object; // present in 5849/212382 samples
  'attachment.addedNames.[]'?: string; // present in 5727/212382 samples
  'attachment.addedTypes'?: object; // present in 1462/212382 samples
  'attachment.addedTypes.[]'?: string; // present in 1458/212382 samples
  'attachment.allowedTools'?: object; // present in 815/212382 samples
  'attachment.allowedTools.[]'?: string; // present in 88/212382 samples
  'attachment.autoModeConsentFlow'?: boolean; // present in 51/212382 samples
  'attachment.banner'?: string; // present in 202/212382 samples
  'attachment.bashFirst'?: boolean; // present in 51/212382 samples
  'attachment.blockingError'?: object; // present in 224/212382 samples
  'attachment.blockingError.blockingError'?: string; // present in 224/212382 samples
  'attachment.blockingError.command'?: string; // present in 224/212382 samples
  'attachment.bypass'?: boolean; // present in 51/212382 samples
  'attachment.command'?: string; // present in 149274/212382 samples
  'attachment.commandMode'?: string; // present in 2030/212382 samples
  'attachment.condition'?: string; // present in 139/212382 samples
  'attachment.content'?: object | string; // present in 188980/212382 samples
  'attachment.content.[]'?: object | string; // present in 28058/212382 samples
  'attachment.content.[].activeForm'?: string; // present in 1513/212382 samples
  'attachment.content.[].content'?: string; // present in 1513/212382 samples
  'attachment.content.[].status'?: string; // present in 1513/212382 samples
  'attachment.content.content'?: string; // present in 3930/212382 samples
  'attachment.content.contentDiffersFromDisk'?: boolean; // present in 3930/212382 samples
  'attachment.content.file'?: object; // present in 84/212382 samples
  'attachment.content.file.content'?: string; // present in 84/212382 samples
  'attachment.content.file.filePath'?: string; // present in 84/212382 samples
  'attachment.content.file.numLines'?: number; // present in 84/212382 samples
  'attachment.content.file.startLine'?: number; // present in 84/212382 samples
  'attachment.content.file.totalLines'?: number; // present in 84/212382 samples
  'attachment.content.globs'?: object; // present in 3322/212382 samples
  'attachment.content.globs.[]'?: string; // present in 3322/212382 samples
  'attachment.content.parent'?: string; // present in 26/212382 samples
  'attachment.content.path'?: string; // present in 3930/212382 samples
  'attachment.content.rawContent'?: string; // present in 3393/212382 samples
  'attachment.content.type'?: string; // present in 4014/212382 samples
  'attachment.data'?: object; // present in 568/212382 samples
  'attachment.data.findings'?: object; // present in 567/212382 samples
  'attachment.data.findings.[]'?: object; // present in 16/212382 samples
  'attachment.data.findings.[].category'?: string; // present in 16/212382 samples
  'attachment.data.findings.[].confidence'?: number; // present in 12/212382 samples
  'attachment.data.findings.[].explanation'?: string; // present in 16/212382 samples
  'attachment.data.findings.[].filePath'?: string; // present in 16/212382 samples
  'attachment.data.findings.[].fix'?: string; // present in 16/212382 samples
  'attachment.data.findings.[].severity'?: string; // present in 16/212382 samples
  'attachment.data.findings.[].vulnerableCode'?: string; // present in 16/212382 samples
  'attachment.data.refuted'?: object; // present in 1/212382 samples
  'attachment.data.survived'?: object; // present in 1/212382 samples
  'attachment.data.survived.[]'?: number; // present in 1/212382 samples
  'attachment.deltaSummary'?: object; // present in 10/212382 samples
  'attachment.description'?: string; // present in 10/212382 samples
  'attachment.displayPath'?: string; // present in 4046/212382 samples
  'attachment.durationMs'?: number; // present in 149291/212382 samples
  'attachment.exitCode'?: number; // present in 149272/212382 samples
  'attachment.filename'?: string; // present in 476/212382 samples
  'attachment.files'?: object; // present in 796/212382 samples
  'attachment.files.[]'?: object; // present in 796/212382 samples
  'attachment.files.[].diagnostics'?: object; // present in 796/212382 samples
  'attachment.files.[].diagnostics.[]'?: object; // present in 796/212382 samples
  'attachment.files.[].uri'?: string; // present in 796/212382 samples
  'attachment.hookEvent'?: string; // present in 176889/212382 samples
  'attachment.hookName'?: string; // present in 176889/212382 samples
  'attachment.ideName'?: string; // present in 1/212382 samples
  'attachment.isInitial'?: boolean; // present in 6930/212382 samples
  'attachment.isMeta'?: boolean; // present in 41/212382 samples
  'attachment.isNew'?: boolean; // present in 796/212382 samples
  'attachment.itemCount'?: number; // present in 3929/212382 samples
  'attachment.iterations'?: number; // present in 17/212382 samples
  'attachment.lineEnd'?: number; // present in 1/212382 samples
  'attachment.lineStart'?: number; // present in 1/212382 samples
  'attachment.maxTurns'?: number; // present in 77/212382 samples
  'attachment.met'?: boolean; // present in 139/212382 samples
  'attachment.model'?: string; // present in 95/212382 samples
  'attachment.names'?: object; // present in 5468/212382 samples
  'attachment.names.[]'?: string; // present in 5468/212382 samples
  'attachment.needsAuthMcpServers'?: object; // present in 1505/212382 samples
  'attachment.needsAuthMcpServers.[]'?: string; // present in 301/212382 samples
  'attachment.newDate'?: string; // present in 82/212382 samples
  'attachment.origin'?: object; // present in 494/212382 samples
  'attachment.origin.body'?: string; // present in 41/212382 samples
  'attachment.origin.from'?: string; // present in 41/212382 samples
  'attachment.origin.kind'?: string; // present in 494/212382 samples
  'attachment.origin.name'?: string; // present in 41/212382 samples
  'attachment.origin.senderTaskId'?: string; // present in 41/212382 samples
  'attachment.outputFilePath'?: string; // present in 10/212382 samples
  'attachment.path'?: string; // present in 3930/212382 samples
  'attachment.pendingMcpServers'?: object; // present in 1513/212382 samples
  'attachment.pendingMcpServers.[]'?: string; // present in 63/212382 samples
  'attachment.prompt'?: object | string; // present in 2030/212382 samples
  'attachment.prompt.[]'?: object; // present in 447/212382 samples
  'attachment.prompt.[].source'?: object; // present in 16/212382 samples
  'attachment.prompt.[].source.data'?: string; // present in 16/212382 samples
  'attachment.prompt.[].source.media_type'?: string; // present in 16/212382 samples
  'attachment.prompt.[].source.type'?: string; // present in 16/212382 samples
  'attachment.prompt.[].text'?: string; // present in 447/212382 samples
  'attachment.prompt.[].type'?: string; // present in 447/212382 samples
  'attachment.readdedNames'?: object; // present in 5344/212382 samples
  'attachment.readdedNames.[]'?: string; // present in 13/212382 samples
  'attachment.reason'?: string; // present in 114/212382 samples
  'attachment.removedNames'?: object; // present in 5849/212382 samples
  'attachment.removedNames.[]'?: string; // present in 114/212382 samples
  'attachment.removedTypes'?: object; // present in 1462/212382 samples
  'attachment.removedTypes.[]'?: string; // present in 4/212382 samples
  'attachment.sentinel'?: boolean; // present in 25/212382 samples
  'attachment.showConcurrencyNote'?: boolean; // present in 1462/212382 samples
  'attachment.skillCount'?: number; // present in 5468/212382 samples
  'attachment.skillDir'?: string; // present in 21/212382 samples
  'attachment.skillNames'?: object; // present in 21/212382 samples
  'attachment.skillNames.[]'?: string; // present in 21/212382 samples
  'attachment.skills'?: object; // present in 9/212382 samples
  'attachment.skills.[]'?: object; // present in 9/212382 samples
  'attachment.skills.[].content'?: string; // present in 9/212382 samples
  'attachment.skills.[].name'?: string; // present in 9/212382 samples
  'attachment.skills.[].path'?: string; // present in 9/212382 samples
  'attachment.snippet'?: string; // present in 379/212382 samples
  'attachment.source_uuid'?: string; // present in 450/212382 samples
  'attachment.status'?: string; // present in 10/212382 samples
  'attachment.stderr'?: string; // present in 149272/212382 samples
  'attachment.stdout'?: string; // present in 149272/212382 samples
  'attachment.steerOnly'?: boolean; // present in 51/212382 samples
  'attachment.taskId'?: string; // present in 10/212382 samples
  'attachment.taskType'?: string; // present in 10/212382 samples
  'attachment.text'?: string; // present in 9579/212382 samples
  'attachment.timedOut'?: boolean; // present in 2/212382 samples
  'attachment.timeoutMs'?: number; // present in 2/212382 samples
  'attachment.timestamp'?: string; // present in 2030/212382 samples
  'attachment.tokens'?: number; // present in 17/212382 samples
  'attachment.toolUseID'?: string; // present in 177659/212382 samples
  'attachment.turnCount'?: number; // present in 77/212382 samples
  'attachment.type': string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isSidechain: boolean;
  parentUuid: object | string;
  sessionId: string;
  session_id?: string; // present in 372/212382 samples
  slug?: string; // present in 29739/212382 samples
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"bridge-session"`. Observed 89 time(s), CLI "(unknown)".
 */
export interface BridgeSession {
  bridgeSessionId: string;
  lastSequenceNum: number;
  ownerAccountUuid?: string; // present in 1/89 samples
  ownerOrganizationUuid?: string; // present in 1/89 samples
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"custom-title"`. Observed 6503 time(s), CLI "(unknown)".
 */
export interface CustomTitle {
  customTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"file-history-delta"`. Observed 1669 time(s), CLI "(unknown)".
 */
export interface FileHistoryDelta {
  backup: object;
  'backup.backupFileName': object | string;
  'backup.backupTime': string;
  'backup.realParentDir'?: string; // present in 1666/1669 samples
  'backup.version': number;
  messageId: string;
  snapshotMessageId: string;
  timestamp: string;
  trackingPath: string;
  type: string;
}

/**
 * Transcript type `"file-history-snapshot"`. Observed 3353 time(s), CLI "(unknown)".
 */
export interface FileHistorySnapshot {
  isSnapshotUpdate: boolean;
  messageId: string;
  snapshot: object;
  'snapshot.messageId': string;
  'snapshot.preCheckpoint'?: boolean; // present in 5/3353 samples
  'snapshot.timestamp': string;
  'snapshot.trackedFileBackups': object;
  'snapshot.trackedFileBackups.[dynamic-key]'?: object; // present in 1245/3353 samples
  type: string;
}

/**
 * Transcript type `"frame-link"`. Observed 85 time(s), CLI "(unknown)".
 */
export interface FrameLink {
  artifactCount?: number; // present in 80/85 samples
  frameUrl?: string; // present in 9/85 samples
  path?: string; // present in 9/85 samples
  sessionId: string;
  timestamp: string;
  title?: string; // present in 9/85 samples
  type: string;
}

/**
 * Transcript type `"last-prompt"`. Observed 19776 time(s), CLI "(unknown)".
 */
export interface LastPrompt {
  lastPrompt?: string; // present in 18891/19776 samples
  leafUuid: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"mode"`. Observed 1873 time(s), CLI "(unknown)".
 */
export interface Mode {
  mode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"permission-mode"`. Observed 68 time(s), CLI "(unknown)".
 */
export interface PermissionMode {
  permissionMode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"pr-link"`. Observed 5244 time(s), CLI "(unknown)".
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
 * Transcript type `"queue-operation"`. Observed 16650 time(s), CLI "(unknown)".
 */
export interface QueueOperation {
  content?: string; // present in 7509/16650 samples
  operation: string;
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Transcript type `"relocated"`. Observed 2458 time(s), CLI "(unknown)".
 */
export interface Relocated {
  relocatedCwd: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"system:api_error"`. Observed 240 time(s), CLI "2.1.218–2.1.235".
 */
export interface SystemApiError {
  cwd: string;
  entrypoint: string;
  error: object;
  'error.connection': object;
  'error.connection.code'?: string; // present in 110/240 samples
  'error.connection.isSSLError'?: boolean; // present in 110/240 samples
  'error.connection.message'?: string; // present in 110/240 samples
  'error.formatted': string;
  'error.isNetworkDown': boolean;
  'error.message': string;
  'error.rateLimits': object;
  'error.requestId'?: string; // present in 127/240 samples
  'error.status'?: number; // present in 127/240 samples
  gitBranch: string;
  isSidechain: boolean;
  level: string;
  maxRetries: number;
  parentUuid: string;
  retryAttempt: number;
  retryInMs: number;
  sessionId: string;
  slug?: string; // present in 16/240 samples
  source: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:compact_boundary"`. Observed 11 time(s), CLI "2.1.220–2.1.239".
 */
export interface SystemCompactBoundary {
  agentId?: string; // present in 1/11 samples
  compactMetadata: object;
  'compactMetadata.cumulativeDroppedTokens': number;
  'compactMetadata.durationMs': number;
  'compactMetadata.postTokens': number;
  'compactMetadata.preCompactDiscoveredTools'?: object; // present in 10/11 samples
  'compactMetadata.preCompactDiscoveredTools.[]'?: string; // present in 10/11 samples
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
  isMeta: boolean;
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
 * Transcript type `"system:informational"`. Observed 5 time(s), CLI "2.1.223–2.1.235".
 */
export interface SystemInformational {
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
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
 * Transcript type `"system:local_command"`. Observed 29 time(s), CLI "2.1.218–2.1.239".
 */
export interface SystemLocalCommand {
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
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
 * Transcript type `"system:stop_hook_summary"`. Observed 4547 time(s), CLI "2.1.215–2.1.239".
 */
export interface SystemStopHookSummary {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  hasOutput: boolean;
  hookAdditionalContext: object;
  hookCount: number;
  hookErrors: object;
  'hookErrors.[]'?: string; // present in 233/4547 samples
  hookInfos: object;
  'hookInfos.[]': object;
  'hookInfos.[].command': string;
  'hookInfos.[].durationMs': number;
  'hookInfos.[].promptText'?: string; // present in 90/4547 samples
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  preventedContinuation: boolean;
  sessionId: string;
  session_id?: string; // present in 20/4547 samples
  slug?: string; // present in 509/4547 samples
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
 * Transcript type `"system:turn_duration"`. Observed 14 time(s), CLI "2.1.220–2.1.223".
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
  pendingBackgroundAgentCount?: number; // present in 1/14 samples
  sessionId: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"user"`. Observed 197472 time(s), CLI "2.1.215–2.1.240".
 */
export interface User {
  agentId?: string; // present in 137247/197472 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  interruptedByShutdown?: boolean; // present in 357/197472 samples
  isCompactSummary?: boolean; // present in 11/197472 samples
  isMeta?: boolean; // present in 4274/197472 samples
  isSidechain: boolean;
  isVisibleInTranscriptOnly?: boolean; // present in 11/197472 samples
  mcpMeta?: object; // present in 1079/197472 samples
  'mcpMeta._meta'?: object; // present in 185/197472 samples
  'mcpMeta._meta.[dynamic-key]'?: object; // present in 185/197472 samples
  'mcpMeta.structuredContent'?: object; // present in 894/197472 samples
  'mcpMeta.structuredContent._hints'?: object; // present in 68/197472 samples
  'mcpMeta.structuredContent._hints.next_steps'?: object; // present in 68/197472 samples
  'mcpMeta.structuredContent._hints.next_steps.[]'?: object; // present in 68/197472 samples
  'mcpMeta.structuredContent._hints.related'?: object; // present in 68/197472 samples
  'mcpMeta.structuredContent._hints.warnings'?: object; // present in 68/197472 samples
  'mcpMeta.structuredContent._hints.warnings.[]'?: string; // present in 27/197472 samples
  'mcpMeta.structuredContent.affected_flows'?: object; // present in 52/197472 samples
  'mcpMeta.structuredContent.affected_flows.[]'?: object; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].created_at'?: string; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].criticality'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].depth'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].entry_point_id'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].file_count'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].id'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].name'?: string; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].node_count'?: number; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].path'?: object; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].steps'?: object; // present in 43/197472 samples
  'mcpMeta.structuredContent.affected_flows.[].updated_at'?: string; // present in 43/197472 samples
  'mcpMeta.structuredContent.appended'?: boolean; // present in 1/197472 samples
  'mcpMeta.structuredContent.build_type'?: string; // present in 77/197472 samples
  'mcpMeta.structuredContent.by_priority'?: object; // present in 18/197472 samples
  'mcpMeta.structuredContent.by_priority.high'?: number; // present in 18/197472 samples
  'mcpMeta.structuredContent.by_priority.low'?: number; // present in 18/197472 samples
  'mcpMeta.structuredContent.by_priority.medium'?: number; // present in 18/197472 samples
  'mcpMeta.structuredContent.changed_file_count'?: number; // present in 13/197472 samples
  'mcpMeta.structuredContent.changed_files'?: object; // present in 142/197472 samples
  'mcpMeta.structuredContent.changed_files.[]'?: string; // present in 142/197472 samples
  'mcpMeta.structuredContent.changed_functions'?: object; // present in 21/197472 samples
  'mcpMeta.structuredContent.changed_functions.[]'?: object; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].file_path'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].id'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].is_test'?: boolean; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].kind'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].language'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].line_end'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].line_start'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].parent_name'?: object | string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].qualified_name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_functions.[].risk_score'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.changed_nodes'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[]'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].file_path'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].id'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].is_test'?: boolean; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].kind'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].language'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].line_end'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].line_start'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].name'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].parent_name'?: object | string; // present in 17/197472 samples
  'mcpMeta.structuredContent.changed_nodes.[].qualified_name'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.communities'?: object; // present in 5/197472 samples
  'mcpMeta.structuredContent.communities.[]'?: string; // present in 5/197472 samples
  'mcpMeta.structuredContent.communities_detected'?: number; // present in 55/197472 samples
  'mcpMeta.structuredContent.count'?: number; // present in 441/197472 samples
  'mcpMeta.structuredContent.created'?: boolean; // present in 1/197472 samples
  'mcpMeta.structuredContent.dependent_files'?: object; // present in 73/197472 samples
  'mcpMeta.structuredContent.dependent_files.[]'?: string; // present in 71/197472 samples
  'mcpMeta.structuredContent.details'?: object; // present in 165/197472 samples
  'mcpMeta.structuredContent.details.content'?: string; // present in 137/197472 samples
  'mcpMeta.structuredContent.details.created'?: boolean; // present in 13/197472 samples
  'mcpMeta.structuredContent.details.deleted'?: boolean; // present in 9/197472 samples
  'mcpMeta.structuredContent.details.exists'?: boolean; // present in 6/197472 samples
  'mcpMeta.structuredContent.details.folders_created'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.details.folders_created.[]'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.details.merge_strategy'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.details.metadata'?: object; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.metadata.aliases'?: object; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.metadata.created'?: string; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.metadata.frontmatter'?: object; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.metadata.modified'?: string; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.metadata.tags'?: object; // present in 155/197472 samples
  'mcpMeta.structuredContent.details.overwritten'?: boolean; // present in 11/197472 samples
  'mcpMeta.structuredContent.details.placeholder_file'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.details.stats'?: object; // present in 6/197472 samples
  'mcpMeta.structuredContent.details.stats.link_count'?: number; // present in 6/197472 samples
  'mcpMeta.structuredContent.details.stats.size_bytes'?: number; // present in 6/197472 samples
  'mcpMeta.structuredContent.details.stats.word_count'?: number; // present in 6/197472 samples
  'mcpMeta.structuredContent.details.updated'?: boolean; // present in 1/197472 samples
  'mcpMeta.structuredContent.edges'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[]'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].confidence'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].confidence_tier'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].file_path'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].id'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].kind'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].line'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].source'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges.[].target'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.edges_by_kind'?: object; // present in 2/197472 samples
  'mcpMeta.structuredContent.edges_by_kind.CALLS'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.edges_by_kind.CONTAINS'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.edges_by_kind.IMPORTS_FROM'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.edges_by_kind.REFERENCES'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.edges_by_kind.TESTED_BY'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.edit_type'?: string; // present in 27/197472 samples
  'mcpMeta.structuredContent.embeddings_count'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.enforced'?: boolean; // present in 8/197472 samples
  'mcpMeta.structuredContent.errors'?: object; // present in 77/197472 samples
  'mcpMeta.structuredContent.files_count'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.files_parsed'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.files_updated'?: number; // present in 73/197472 samples
  'mcpMeta.structuredContent.findings'?: object; // present in 3/197472 samples
  'mcpMeta.structuredContent.flows_affected'?: object; // present in 5/197472 samples
  'mcpMeta.structuredContent.flows_affected.[]'?: string; // present in 5/197472 samples
  'mcpMeta.structuredContent.flows_detected'?: number; // present in 55/197472 samples
  'mcpMeta.structuredContent.folder_rule'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.fts_indexed'?: number; // present in 77/197472 samples
  'mcpMeta.structuredContent.fts_rebuilt'?: boolean; // present in 77/197472 samples
  'mcpMeta.structuredContent.gaps'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.isolated_nodes'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.isolated_nodes.[]'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.single_file_communities'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.single_file_communities.[]'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.thin_communities'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.thin_communities.[]'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.untested_hotspots'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.gaps.untested_hotspots.[]'?: object; // present in 16/197472 samples
  'mcpMeta.structuredContent.impacted_file_count'?: number; // present in 5/197472 samples
  'mcpMeta.structuredContent.impacted_files'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_files.[]'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[]'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].file_path'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].id'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].is_test'?: boolean; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].kind'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].language'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].line_end'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].line_start'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].name'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].parent_name'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.impacted_nodes.[].qualified_name'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.instructions'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.items'?: object; // present in 20/197472 samples
  'mcpMeta.structuredContent.items.[]'?: object; // present in 17/197472 samples
  'mcpMeta.structuredContent.items.[].description'?: string; // present in 11/197472 samples
  'mcpMeta.structuredContent.items.[].name'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.items.[].path'?: string; // present in 17/197472 samples
  'mcpMeta.structuredContent.key_entities'?: object; // present in 8/197472 samples
  'mcpMeta.structuredContent.key_entities.[]'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.languages'?: object; // present in 2/197472 samples
  'mcpMeta.structuredContent.languages.[]'?: string; // present in 2/197472 samples
  'mcpMeta.structuredContent.last_updated'?: string; // present in 2/197472 samples
  'mcpMeta.structuredContent.message'?: string; // present in 30/197472 samples
  'mcpMeta.structuredContent.min_lines'?: number; // present in 36/197472 samples
  'mcpMeta.structuredContent.next_tool_suggestions'?: object; // present in 39/197472 samples
  'mcpMeta.structuredContent.next_tool_suggestions.[]'?: string; // present in 39/197472 samples
  'mcpMeta.structuredContent.nodes_by_kind'?: object; // present in 2/197472 samples
  'mcpMeta.structuredContent.nodes_by_kind.Class'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.nodes_by_kind.File'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.nodes_by_kind.Function'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.nodes_by_kind.Test'?: number; // present in 2/197472 samples
  'mcpMeta.structuredContent.operation'?: string; // present in 193/197472 samples
  'mcpMeta.structuredContent.path'?: string; // present in 194/197472 samples
  'mcpMeta.structuredContent.postprocess_level'?: string; // present in 77/197472 samples
  'mcpMeta.structuredContent.query'?: object | string; // present in 426/197472 samples
  'mcpMeta.structuredContent.query.context_length'?: number; // present in 422/197472 samples
  'mcpMeta.structuredContent.query.date_type'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.days_ago'?: number; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.description'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.flags'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.max_results'?: number; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.mode'?: string; // present in 423/197472 samples
  'mcpMeta.structuredContent.query.operator'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.pattern'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.query.text'?: string; // present in 421/197472 samples
  'mcpMeta.structuredContent.query.type'?: string; // present in 421/197472 samples
  'mcpMeta.structuredContent.questions'?: object; // present in 18/197472 samples
  'mcpMeta.structuredContent.questions.[]'?: object; // present in 18/197472 samples
  'mcpMeta.structuredContent.questions.[].category'?: string; // present in 18/197472 samples
  'mcpMeta.structuredContent.questions.[].priority'?: string; // present in 18/197472 samples
  'mcpMeta.structuredContent.questions.[].question'?: string; // present in 18/197472 samples
  'mcpMeta.structuredContent.questions.[].target'?: string; // present in 18/197472 samples
  'mcpMeta.structuredContent.required_frontmatter_keys'?: object; // present in 8/197472 samples
  'mcpMeta.structuredContent.required_frontmatter_keys.[]'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.required_headings'?: object; // present in 8/197472 samples
  'mcpMeta.structuredContent.required_headings.[]'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.rescript_resolution'?: object; // present in 77/197472 samples
  'mcpMeta.structuredContent.rescript_resolution.calls_resolved'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.rescript_resolution.files_indexed'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.rescript_resolution.imports_resolved'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.result'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.result.NextToken'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.result.Registries'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.result.Registries.[]'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.results'?: object; // present in 463/197472 samples
  'mcpMeta.structuredContent.results.[]'?: object; // present in 144/197472 samples
  'mcpMeta.structuredContent.results.[].context'?: string; // present in 79/197472 samples
  'mcpMeta.structuredContent.results.[].date'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.results.[].days_ago'?: number; // present in 1/197472 samples
  'mcpMeta.structuredContent.results.[].description'?: string; // present in 27/197472 samples
  'mcpMeta.structuredContent.results.[].file_path'?: string; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].id'?: number | string; // present in 35/197472 samples
  'mcpMeta.structuredContent.results.[].is_test'?: boolean; // present in 34/197472 samples
  'mcpMeta.structuredContent.results.[].kind'?: string; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].language'?: string; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].line_count'?: number; // present in 34/197472 samples
  'mcpMeta.structuredContent.results.[].line_end'?: number; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].line_start'?: number; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].match_count'?: number; // present in 62/197472 samples
  'mcpMeta.structuredContent.results.[].match_type'?: string; // present in 96/197472 samples
  'mcpMeta.structuredContent.results.[].matches'?: object; // present in 79/197472 samples
  'mcpMeta.structuredContent.results.[].name'?: string; // present in 64/197472 samples
  'mcpMeta.structuredContent.results.[].params'?: object | string; // present in 3/197472 samples
  'mcpMeta.structuredContent.results.[].parent_name'?: object | string; // present in 34/197472 samples
  'mcpMeta.structuredContent.results.[].path'?: string; // present in 106/197472 samples
  'mcpMeta.structuredContent.results.[].qualified_name'?: string; // present in 37/197472 samples
  'mcpMeta.structuredContent.results.[].relative_path'?: string; // present in 34/197472 samples
  'mcpMeta.structuredContent.results.[].return_type'?: object | string; // present in 3/197472 samples
  'mcpMeta.structuredContent.results.[].score'?: number; // present in 108/197472 samples
  'mcpMeta.structuredContent.results.[].signature'?: string; // present in 3/197472 samples
  'mcpMeta.structuredContent.results.[].similarity'?: number; // present in 1/197472 samples
  'mcpMeta.structuredContent.results.[].text'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.results.[].title'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.results.[].url'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.review_priorities'?: object; // present in 34/197472 samples
  'mcpMeta.structuredContent.review_priorities.[]'?: object | string; // present in 32/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].file_path'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].id'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].is_test'?: boolean; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].kind'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].language'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].line_end'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].line_start'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].parent_name'?: object | string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].qualified_name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.review_priorities.[].risk_score'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.risk'?: string; // present in 10/197472 samples
  'mcpMeta.structuredContent.risk_score'?: number; // present in 34/197472 samples
  'mcpMeta.structuredContent.scope'?: object; // present in 23/197472 samples
  'mcpMeta.structuredContent.scope.directory'?: string; // present in 20/197472 samples
  'mcpMeta.structuredContent.scope.path'?: string; // present in 3/197472 samples
  'mcpMeta.structuredContent.scope.recursive'?: boolean; // present in 20/197472 samples
  'mcpMeta.structuredContent.scope.type'?: string; // present in 3/197472 samples
  'mcpMeta.structuredContent.search_mode'?: string; // present in 3/197472 samples
  'mcpMeta.structuredContent.section'?: string; // present in 27/197472 samples
  'mcpMeta.structuredContent.section_created'?: boolean; // present in 27/197472 samples
  'mcpMeta.structuredContent.section_found'?: boolean; // present in 27/197472 samples
  'mcpMeta.structuredContent.signatures_updated'?: boolean; // present in 77/197472 samples
  'mcpMeta.structuredContent.skeleton'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.spring_resolution'?: object; // present in 77/197472 samples
  'mcpMeta.structuredContent.spring_resolution.calls_resolved'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.spring_resolution.files_indexed'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.status'?: string; // present in 210/197472 samples
  'mcpMeta.structuredContent.success'?: boolean; // present in 193/197472 samples
  'mcpMeta.structuredContent.summaries_computed'?: boolean; // present in 55/197472 samples
  'mcpMeta.structuredContent.summary'?: object | string; // present in 229/197472 samples
  'mcpMeta.structuredContent.summary.affected_notes'?: number; // present in 3/197472 samples
  'mcpMeta.structuredContent.summary.broken_link_count'?: number; // present in 3/197472 samples
  'mcpMeta.structuredContent.summary.isolated_nodes'?: number; // present in 16/197472 samples
  'mcpMeta.structuredContent.summary.notes_checked'?: number; // present in 3/197472 samples
  'mcpMeta.structuredContent.summary.single_file_communities'?: number; // present in 16/197472 samples
  'mcpMeta.structuredContent.summary.thin_communities'?: number; // present in 16/197472 samples
  'mcpMeta.structuredContent.summary.untested_hotspots'?: number; // present in 16/197472 samples
  'mcpMeta.structuredContent.tags'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.after'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.after.[]'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.before'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.before.[]'?: string; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.changes'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.changes.added'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.tags.changes.removed'?: object; // present in 1/197472 samples
  'mcpMeta.structuredContent.target'?: string; // present in 3/197472 samples
  'mcpMeta.structuredContent.template_frontmatter_keys'?: object; // present in 8/197472 samples
  'mcpMeta.structuredContent.template_frontmatter_keys.[]'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.template_path'?: string; // present in 8/197472 samples
  'mcpMeta.structuredContent.temporal_resolution'?: object; // present in 77/197472 samples
  'mcpMeta.structuredContent.temporal_resolution.calls_resolved'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.temporal_resolution.files_indexed'?: number; // present in 4/197472 samples
  'mcpMeta.structuredContent.test_gap_count'?: number; // present in 13/197472 samples
  'mcpMeta.structuredContent.test_gaps'?: object; // present in 21/197472 samples
  'mcpMeta.structuredContent.test_gaps.[]'?: object; // present in 19/197472 samples
  'mcpMeta.structuredContent.test_gaps.[].file'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.test_gaps.[].line_end'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.test_gaps.[].line_start'?: number; // present in 19/197472 samples
  'mcpMeta.structuredContent.test_gaps.[].name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.test_gaps.[].qualified_name'?: string; // present in 19/197472 samples
  'mcpMeta.structuredContent.total'?: number; // present in 51/197472 samples
  'mcpMeta.structuredContent.total_count'?: number; // present in 421/197472 samples
  'mcpMeta.structuredContent.total_edges'?: number; // present in 79/197472 samples
  'mcpMeta.structuredContent.total_found'?: number; // present in 36/197472 samples
  'mcpMeta.structuredContent.total_gaps'?: number; // present in 16/197472 samples
  'mcpMeta.structuredContent.total_impacted'?: number; // present in 17/197472 samples
  'mcpMeta.structuredContent.total_nodes'?: number; // present in 79/197472 samples
  'mcpMeta.structuredContent.truncated'?: boolean; // present in 445/197472 samples
  'mcpMeta.structuredContent.warnings'?: object; // present in 2/197472 samples
  'mcpMeta.structuredContent.warnings.[]'?: string; // present in 2/197472 samples
  message: object;
  'message.content': object | string;
  'message.content.[]'?: object; // present in 185968/197472 samples
  'message.content.[].content'?: object | string; // present in 182501/197472 samples
  'message.content.[].content.[]'?: object; // present in 6547/197472 samples
  'message.content.[].is_error'?: boolean; // present in 99759/197472 samples
  'message.content.[].source'?: object; // present in 71/197472 samples
  'message.content.[].source.data'?: string; // present in 71/197472 samples
  'message.content.[].source.media_type'?: string; // present in 71/197472 samples
  'message.content.[].source.type'?: string; // present in 71/197472 samples
  'message.content.[].text'?: string; // present in 3467/197472 samples
  'message.content.[].title'?: string; // present in 1/197472 samples
  'message.content.[].tool_use_id'?: string; // present in 182501/197472 samples
  'message.content.[].type'?: string; // present in 185968/197472 samples
  'message.role': string;
  origin?: object; // present in 4786/197472 samples
  'origin.body'?: string; // present in 162/197472 samples
  'origin.from'?: string; // present in 162/197472 samples
  'origin.kind'?: string; // present in 4786/197472 samples
  'origin.name'?: string; // present in 162/197472 samples
  'origin.senderTaskId'?: string; // present in 162/197472 samples
  parentUuid: object | string;
  permissionMode?: string; // present in 5626/197472 samples
  promptId?: string; // present in 197433/197472 samples
  promptSource?: string; // present in 5627/197472 samples
  sessionId: string;
  session_id?: string; // present in 95/197472 samples
  slug?: string; // present in 16394/197472 samples
  sourceToolAssistantUUID?: string; // present in 182501/197472 samples
  sourceToolUseID?: string; // present in 776/197472 samples
  timestamp: string;
  toolDenialKind?: string; // present in 993/197472 samples
  toolEndsTurn?: boolean; // present in 568/197472 samples
  toolUseResult?: object | string; // present in 57345/197472 samples
  'toolUseResult.[]'?: object; // present in 244/197472 samples
  'toolUseResult.[].text'?: string; // present in 244/197472 samples
  'toolUseResult.[].type'?: string; // present in 244/197472 samples
  'toolUseResult.action'?: string; // present in 61/197472 samples
  'toolUseResult.agentId'?: string; // present in 3822/197472 samples
  'toolUseResult.agentType'?: string; // present in 1307/197472 samples
  'toolUseResult.allowedTools'?: object; // present in 23/197472 samples
  'toolUseResult.allowedTools.[]'?: string; // present in 23/197472 samples
  'toolUseResult.answers'?: object; // present in 702/197472 samples
  'toolUseResult.answers.[dynamic-key]'?: string; // present in 702/197472 samples
  'toolUseResult.appliedLimit'?: number; // present in 159/197472 samples
  'toolUseResult.artifact_id'?: string; // present in 4/197472 samples
  'toolUseResult.artifacts'?: object; // present in 1/197472 samples
  'toolUseResult.artifacts.[]'?: object; // present in 1/197472 samples
  'toolUseResult.artifacts.[].title'?: string; // present in 1/197472 samples
  'toolUseResult.artifacts.[].updatedAt'?: string; // present in 1/197472 samples
  'toolUseResult.artifacts.[].url'?: string; // present in 1/197472 samples
  'toolUseResult.backgroundCwdHint'?: string; // present in 61/197472 samples
  'toolUseResult.backgroundTaskId'?: string; // present in 687/197472 samples
  'toolUseResult.bytes'?: number; // present in 56/197472 samples
  'toolUseResult.canReadOutputFile'?: boolean; // present in 2505/197472 samples
  'toolUseResult.cancelledWakeups'?: number; // present in 30/197472 samples
  'toolUseResult.clampedDelaySeconds'?: number; // present in 110/197472 samples
  'toolUseResult.code'?: number; // present in 56/197472 samples
  'toolUseResult.codeText'?: string; // present in 56/197472 samples
  'toolUseResult.command'?: string; // present in 34/197472 samples
  'toolUseResult.commandName'?: string; // present in 394/197472 samples
  'toolUseResult.content'?: object | string; // present in 3483/197472 samples
  'toolUseResult.content.[]'?: object; // present in 1307/197472 samples
  'toolUseResult.content.[].text'?: string; // present in 1307/197472 samples
  'toolUseResult.content.[].type'?: string; // present in 1307/197472 samples
  'toolUseResult.countIsComplete'?: boolean; // present in 445/197472 samples
  'toolUseResult.dangerouslyDisableSandbox'?: boolean; // present in 13/197472 samples
  'toolUseResult.description'?: string; // present in 2505/197472 samples
  'toolUseResult.disabledReason'?: string; // present in 5/197472 samples
  'toolUseResult.discardedCommits'?: number; // present in 9/197472 samples
  'toolUseResult.discardedFiles'?: number; // present in 9/197472 samples
  'toolUseResult.durationMs'?: number; // present in 501/197472 samples
  'toolUseResult.durationSeconds'?: number; // present in 40/197472 samples
  'toolUseResult.file'?: object; // present in 8838/197472 samples
  'toolUseResult.file.base64'?: string; // present in 30/197472 samples
  'toolUseResult.file.content'?: string; // present in 8808/197472 samples
  'toolUseResult.file.dimensions'?: object; // present in 30/197472 samples
  'toolUseResult.file.dimensions.displayHeight'?: number; // present in 30/197472 samples
  'toolUseResult.file.dimensions.displayWidth'?: number; // present in 30/197472 samples
  'toolUseResult.file.dimensions.originalHeight'?: number; // present in 30/197472 samples
  'toolUseResult.file.dimensions.originalWidth'?: number; // present in 30/197472 samples
  'toolUseResult.file.filePath'?: string; // present in 8808/197472 samples
  'toolUseResult.file.numLines'?: number; // present in 8808/197472 samples
  'toolUseResult.file.originalSize'?: number; // present in 30/197472 samples
  'toolUseResult.file.startLine'?: number; // present in 8808/197472 samples
  'toolUseResult.file.totalLines'?: number; // present in 8808/197472 samples
  'toolUseResult.file.truncatedByTokenCap'?: boolean; // present in 23/197472 samples
  'toolUseResult.file.type'?: string; // present in 30/197472 samples
  'toolUseResult.fileCount'?: number; // present in 23/197472 samples
  'toolUseResult.filePath'?: string; // present in 3455/197472 samples
  'toolUseResult.filenames'?: object; // present in 2596/197472 samples
  'toolUseResult.filenames.[]'?: string; // present in 1292/197472 samples
  'toolUseResult.gitOperation'?: object; // present in 1435/197472 samples
  'toolUseResult.gitOperation.branch'?: object; // present in 104/197472 samples
  'toolUseResult.gitOperation.branch.action'?: string; // present in 104/197472 samples
  'toolUseResult.gitOperation.branch.ref'?: string; // present in 104/197472 samples
  'toolUseResult.gitOperation.commit'?: object; // present in 558/197472 samples
  'toolUseResult.gitOperation.commit.branch'?: string; // present in 193/197472 samples
  'toolUseResult.gitOperation.commit.kind'?: string; // present in 558/197472 samples
  'toolUseResult.gitOperation.commit.sha'?: string; // present in 558/197472 samples
  'toolUseResult.gitOperation.pr'?: object; // present in 302/197472 samples
  'toolUseResult.gitOperation.pr.action'?: string; // present in 302/197472 samples
  'toolUseResult.gitOperation.pr.number'?: number; // present in 302/197472 samples
  'toolUseResult.gitOperation.pr.url'?: string; // present in 259/197472 samples
  'toolUseResult.gitOperation.push'?: object; // present in 501/197472 samples
  'toolUseResult.gitOperation.push.branch'?: string; // present in 501/197472 samples
  'toolUseResult.interrupted'?: boolean; // present in 24578/197472 samples
  'toolUseResult.isAsync'?: boolean; // present in 2505/197472 samples
  'toolUseResult.isImage'?: boolean; // present in 24578/197472 samples
  'toolUseResult.listing'?: string; // present in 626/197472 samples
  'toolUseResult.liveSubscription'?: string; // present in 9/197472 samples
  'toolUseResult.localSent'?: boolean; // present in 5/197472 samples
  'toolUseResult.matches'?: object; // present in 757/197472 samples
  'toolUseResult.matches.[]'?: string; // present in 745/197472 samples
  'toolUseResult.memdirStamped'?: boolean; // present in 4/197472 samples
  'toolUseResult.message'?: string; // present in 604/197472 samples
  'toolUseResult.mode'?: string; // present in 2151/197472 samples
  'toolUseResult.model'?: string; // present in 39/197472 samples
  'toolUseResult.msg_id'?: string; // present in 9/197472 samples
  'toolUseResult.newString'?: string; // present in 2434/197472 samples
  'toolUseResult.newTodos'?: object; // present in 1313/197472 samples
  'toolUseResult.newTodos.[]'?: object; // present in 1313/197472 samples
  'toolUseResult.newTodos.[].activeForm'?: string; // present in 1313/197472 samples
  'toolUseResult.newTodos.[].content'?: string; // present in 1313/197472 samples
  'toolUseResult.newTodos.[].status'?: string; // present in 1313/197472 samples
  'toolUseResult.noOutputExpected'?: boolean; // present in 24578/197472 samples
  'toolUseResult.numFiles'?: number; // present in 2596/197472 samples
  'toolUseResult.numLines'?: number; // present in 1176/197472 samples
  'toolUseResult.numMatches'?: number; // present in 3/197472 samples
  'toolUseResult.oldString'?: string; // present in 2434/197472 samples
  'toolUseResult.oldTodos'?: object; // present in 1313/197472 samples
  'toolUseResult.oldTodos.[]'?: object; // present in 1111/197472 samples
  'toolUseResult.oldTodos.[].activeForm'?: string; // present in 1111/197472 samples
  'toolUseResult.oldTodos.[].content'?: string; // present in 1111/197472 samples
  'toolUseResult.oldTodos.[].status'?: string; // present in 1111/197472 samples
  'toolUseResult.operation'?: string; // present in 24/197472 samples
  'toolUseResult.originalCwd'?: string; // present in 61/197472 samples
  'toolUseResult.originalFile'?: object | string; // present in 3431/197472 samples
  'toolUseResult.outputFile'?: string; // present in 2505/197472 samples
  'toolUseResult.path'?: string; // present in 9/197472 samples
  'toolUseResult.persistedOutputPath'?: string; // present in 68/197472 samples
  'toolUseResult.persistedOutputSize'?: number; // present in 68/197472 samples
  'toolUseResult.persistent'?: boolean; // present in 46/197472 samples
  'toolUseResult.pin'?: object; // present in 412/197472 samples
  'toolUseResult.pin.id'?: string; // present in 412/197472 samples
  'toolUseResult.pin.name'?: string; // present in 412/197472 samples
  'toolUseResult.pin.ref'?: string; // present in 412/197472 samples
  'toolUseResult.prompt'?: string; // present in 3812/197472 samples
  'toolUseResult.pushSent'?: boolean; // present in 5/197472 samples
  'toolUseResult.query'?: string; // present in 797/197472 samples
  'toolUseResult.questions'?: object; // present in 702/197472 samples
  'toolUseResult.questions.[]'?: object; // present in 702/197472 samples
  'toolUseResult.questions.[].header'?: string; // present in 702/197472 samples
  'toolUseResult.questions.[].multiSelect'?: boolean; // present in 702/197472 samples
  'toolUseResult.questions.[].options'?: object; // present in 702/197472 samples
  'toolUseResult.questions.[].options.[]'?: object; // present in 702/197472 samples
  'toolUseResult.questions.[].question'?: string; // present in 702/197472 samples
  'toolUseResult.replaceAll'?: boolean; // present in 2434/197472 samples
  'toolUseResult.resolvedModel'?: string; // present in 3812/197472 samples
  'toolUseResult.result'?: string; // present in 90/197472 samples
  'toolUseResult.resultCount'?: number; // present in 23/197472 samples
  'toolUseResult.results'?: object; // present in 40/197472 samples
  'toolUseResult.results.[]'?: object | string; // present in 40/197472 samples
  'toolUseResult.results.[].content'?: object; // present in 40/197472 samples
  'toolUseResult.results.[].content.[]'?: object; // present in 40/197472 samples
  'toolUseResult.results.[].tool_use_id'?: string; // present in 40/197472 samples
  'toolUseResult.resumedAgentId'?: string; // present in 271/197472 samples
  'toolUseResult.retrieval_status'?: string; // present in 73/197472 samples
  'toolUseResult.returnCodeInterpretation'?: string; // present in 95/197472 samples
  'toolUseResult.routing'?: object; // present in 9/197472 samples
  'toolUseResult.routing.content'?: string; // present in 9/197472 samples
  'toolUseResult.routing.sender'?: string; // present in 9/197472 samples
  'toolUseResult.routing.senderColor'?: string; // present in 9/197472 samples
  'toolUseResult.routing.summary'?: string; // present in 9/197472 samples
  'toolUseResult.routing.target'?: string; // present in 9/197472 samples
  'toolUseResult.routing.targetColor'?: string; // present in 9/197472 samples
  'toolUseResult.scheduledFor'?: number; // present in 110/197472 samples
  'toolUseResult.searchCount'?: number; // present in 40/197472 samples
  'toolUseResult.sentAt'?: string; // present in 5/197472 samples
  'toolUseResult.staleReadFileStateHint'?: string; // present in 26/197472 samples
  'toolUseResult.staleRecovered'?: boolean; // present in 26/197472 samples
  'toolUseResult.status'?: string; // present in 3822/197472 samples
  'toolUseResult.stderr'?: string; // present in 24578/197472 samples
  'toolUseResult.stdout'?: string; // present in 24578/197472 samples
  'toolUseResult.stopped'?: boolean; // present in 30/197472 samples
  'toolUseResult.structuredPatch'?: object; // present in 3431/197472 samples
  'toolUseResult.structuredPatch.[]'?: object; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].lines'?: object; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].lines.[]'?: string; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].newLines'?: number; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].newStart'?: number; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].oldLines'?: number; // present in 2551/197472 samples
  'toolUseResult.structuredPatch.[].oldStart'?: number; // present in 2551/197472 samples
  'toolUseResult.success'?: boolean; // present in 817/197472 samples
  'toolUseResult.task'?: object; // present in 73/197472 samples
  'toolUseResult.task.description'?: string; // present in 73/197472 samples
  'toolUseResult.task.exitCode'?: number | object; // present in 22/197472 samples
  'toolUseResult.task.isRawTranscript'?: boolean; // present in 51/197472 samples
  'toolUseResult.task.output'?: string; // present in 73/197472 samples
  'toolUseResult.task.prompt'?: string; // present in 51/197472 samples
  'toolUseResult.task.result'?: string; // present in 51/197472 samples
  'toolUseResult.task.status'?: string; // present in 73/197472 samples
  'toolUseResult.task.task_id'?: string; // present in 73/197472 samples
  'toolUseResult.task.task_type'?: string; // present in 73/197472 samples
  'toolUseResult.taskId'?: string; // present in 46/197472 samples
  'toolUseResult.task_id'?: string; // present in 34/197472 samples
  'toolUseResult.task_type'?: string; // present in 34/197472 samples
  'toolUseResult.tasks'?: object; // present in 1/197472 samples
  'toolUseResult.timedOutAfterMs'?: number; // present in 108/197472 samples
  'toolUseResult.timeoutMs'?: number; // present in 46/197472 samples
  'toolUseResult.title'?: string; // present in 9/197472 samples
  'toolUseResult.toolStats'?: object; // present in 1303/197472 samples
  'toolUseResult.toolStats.bashCount'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.editFileCount'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.linesAdded'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.linesRemoved'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.otherToolCount'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.readCount'?: number; // present in 1303/197472 samples
  'toolUseResult.toolStats.searchCount'?: number; // present in 1303/197472 samples
  'toolUseResult.totalDurationMs'?: number; // present in 1307/197472 samples
  'toolUseResult.totalFiles'?: number; // present in 972/197472 samples
  'toolUseResult.totalLines'?: number; // present in 1176/197472 samples
  'toolUseResult.totalMatches'?: number; // present in 445/197472 samples
  'toolUseResult.totalTokens'?: number; // present in 1307/197472 samples
  'toolUseResult.totalToolUseCount'?: number; // present in 1307/197472 samples
  'toolUseResult.total_deferred_tools'?: number; // present in 757/197472 samples
  'toolUseResult.truncated'?: boolean; // present in 446/197472 samples
  'toolUseResult.type'?: string; // present in 9835/197472 samples
  'toolUseResult.updated'?: boolean; // present in 9/197472 samples
  'toolUseResult.url'?: string; // present in 65/197472 samples
  'toolUseResult.usage'?: object; // present in 1307/197472 samples
  'toolUseResult.usage.cache_creation'?: object; // present in 1307/197472 samples
  'toolUseResult.usage.cache_creation.ephemeral_1h_input_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.cache_creation.ephemeral_5m_input_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.cache_creation_input_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.cache_read_input_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.inference_geo'?: string; // present in 1307/197472 samples
  'toolUseResult.usage.input_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.iterations'?: object; // present in 1307/197472 samples
  'toolUseResult.usage.iterations.[]'?: object; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].cache_creation'?: object; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].cache_read_input_tokens'?: number; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].input_tokens'?: number; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].output_tokens'?: number; // present in 1305/197472 samples
  'toolUseResult.usage.iterations.[].type'?: string; // present in 1305/197472 samples
  'toolUseResult.usage.output_tokens'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.output_tokens_details'?: object; // present in 237/197472 samples
  'toolUseResult.usage.output_tokens_details.thinking_tokens'?: number; // present in 237/197472 samples
  'toolUseResult.usage.server_tool_use'?: object; // present in 1307/197472 samples
  'toolUseResult.usage.server_tool_use.web_fetch_requests'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.server_tool_use.web_search_requests'?: number; // present in 1307/197472 samples
  'toolUseResult.usage.service_tier'?: string; // present in 1307/197472 samples
  'toolUseResult.usage.speed'?: string; // present in 1307/197472 samples
  'toolUseResult.userModified'?: boolean; // present in 3431/197472 samples
  'toolUseResult.version'?: string; // present in 9/197472 samples
  'toolUseResult.wasClamped'?: boolean; // present in 110/197472 samples
  'toolUseResult.worktreeBranch'?: string; // present in 58/197472 samples
  'toolUseResult.worktreePath'?: string; // present in 143/197472 samples
  turnCompanion?: boolean; // present in 67/197472 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"worktree-state"`. Observed 6041 time(s), CLI "(unknown)".
 */
export interface WorktreeState {
  sessionId: string;
  type: string;
  worktreeSession: object;
  'worktreeSession.enteredExisting'?: boolean; // present in 2264/6041 samples
  'worktreeSession.hookBased'?: boolean; // present in 3210/6041 samples
  'worktreeSession.originalBranch'?: string; // present in 95/6041 samples
  'worktreeSession.originalCwd'?: string; // present in 5569/6041 samples
  'worktreeSession.originalHeadCommit'?: string; // present in 95/6041 samples
  'worktreeSession.preEnterOriginalCwd'?: string; // present in 5569/6041 samples
  'worktreeSession.sessionId'?: string; // present in 5569/6041 samples
  'worktreeSession.worktreeBranch'?: string; // present in 2359/6041 samples
  'worktreeSession.worktreeName'?: string; // present in 5569/6041 samples
  'worktreeSession.worktreePath'?: string; // present in 5569/6041 samples
}
