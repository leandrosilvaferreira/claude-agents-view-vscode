/**
 * AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, not a runtime contract, do not hand-edit, do not import from runtime parsing code.
 *
 * Generated: 2026-10-21T22:35:10.540Z
 * CLI versions observed: "2.1.215", "2.1.218", "2.1.219", "2.1.220", "2.1.221", "2.1.222", "2.1.223", "2.1.224", "2.1.226", "2.1.227", "2.1.228", "2.1.229", "2.1.231", "2.1.232", "2.1.233", "2.1.234", "2.1.235", "2.1.237", "2.1.238", "2.1.239", "2.1.240", "2.1.241", "2.1.245", "2.1.246", "2.1.247", "2.1.250", "2.1.251", "2.1.252", "2.1.257", "2.1.258", "2.1.259", "2.1.260", "2.1.261", "2.1.263", "2.1.266", "2.1.267", "2.1.269", "2.1.270", "2.1.272", "2.1.275", "2.1.276", "2.1.278", "2.1.280", "2.1.281", "2.1.282", "2.1.283", "2.1.284", "2.1.285", "2.1.286", "2.1.287", "2.1.288", "2.1.289", "2.1.290", "2.1.292", "2.1.293", "2.1.294", "2.1.295", "2.1.296", "2.1.300", "2.1.301", "2.1.302", "2.1.303", "2.1.304", "2.1.305", "2.1.306"
 *
 * Rendered from scripts/schema-gen/schema-observations.json by generateTsReference.ts (T9,
 * see transcript-schema-gen.md). Each interface below is one observed transcript `type` (or
 * `type:subtype`) bucket; each property is the exact dotted field path recorded by
 * schemaAggregator.ts (`[]` marks a collapsed array segment), typed as the union of JS
 * `typeof` values actually observed. A trailing `?` plus a presence-count comment means the
 * field was not present on every sampled line of that bucket.
 */

/**
 * Transcript type `"agent-color"`. Observed 3180 time(s), CLI "(unknown)".
 */
export interface AgentColor {
  agentColor: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"agent-name"`. Observed 41783 time(s), CLI "(unknown)".
 */
export interface AgentName {
  agentName: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"ai-title"`. Observed 103553 time(s), CLI "(unknown)".
 */
export interface AiTitle {
  aiTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"api-request"`. Observed 33559 time(s), CLI "2.1.301–2.1.306".
 */
export interface ApiRequest {
  agentId?: string; // present in 21760/33559 samples
  base?: string; // present in 32039/33559 samples
  cacheControl: object;
  'cacheControl.[]': object;
  'cacheControl.[].path': object;
  'cacheControl.[].path.[]': number | string;
  'cacheControl.[].value': object;
  'cacheControl.[].value.scope'?: string; // present in 11799/33559 samples
  'cacheControl.[].value.ttl'?: string; // present in 11798/33559 samples
  'cacheControl.[].value.type': string;
  id: string;
  keep: number;
  params: object;
  'params.betas': object;
  'params.betas.[]': string;
  'params.context_management': object;
  'params.context_management.edits': object;
  'params.context_management.edits.[]': object;
  'params.context_management.edits.[].keep': string;
  'params.context_management.edits.[].type': string;
  'params.max_tokens': number;
  'params.model': string;
  'params.output_config': object;
  'params.output_config.effort': string;
  'params.thinking': object;
  'params.thinking.display': string;
  'params.thinking.type': string;
  querySource: string;
  requestDigest: string;
  sessionId: string;
  shapeHash: string;
  tail: object;
  'tail.[]'?: string; // present in 33304/33559 samples
  timestamp: string;
  type: string;
  version: string;
}

/**
 * Transcript type `"api-request-blob"`. Observed 54883 time(s), CLI "(unknown)".
 */
export interface ApiRequestBlob {
  agentId?: string; // present in 38389/54883 samples
  hash: string;
  message: object;
  'message.content': object | string;
  'message.content.[]'?: object; // present in 53074/54883 samples
  'message.content.[].caller'?: object; // present in 9525/54883 samples
  'message.content.[].caller.type'?: string; // present in 9525/54883 samples
  'message.content.[].content'?: object | string; // present in 5493/54883 samples
  'message.content.[].content.[]'?: object; // present in 777/54883 samples
  'message.content.[].id'?: string; // present in 14798/54883 samples
  'message.content.[].input'?: object; // present in 14798/54883 samples
  'message.content.[].input.[dynamic-key]'?: boolean | number | object | string; // present in 308/54883 samples
  'message.content.[].input.action'?: string; // present in 6/54883 samples
  'message.content.[].input.allow_large'?: boolean; // present in 2/54883 samples
  'message.content.[].input.args'?: string; // present in 4/54883 samples
  'message.content.[].input.command'?: string; // present in 11341/54883 samples
  'message.content.[].input.content'?: string; // present in 472/54883 samples
  'message.content.[].input.description'?: string; // present in 5103/54883 samples
  'message.content.[].input.file_path'?: string; // present in 4886/54883 samples
  'message.content.[].input.file_text'?: string; // present in 1/54883 samples
  'message.content.[].input.glob'?: string; // present in 107/54883 samples
  'message.content.[].input.head_limit'?: string; // present in 42/54883 samples
  'message.content.[].input.isolation'?: string; // present in 1/54883 samples
  'message.content.[].input.label'?: string; // present in 1/54883 samples
  'message.content.[].input.limit'?: number; // present in 988/54883 samples
  'message.content.[].input.max_results'?: number | string; // present in 64/54883 samples
  'message.content.[].input.message'?: string; // present in 84/54883 samples
  'message.content.[].input.mode'?: string; // present in 4/54883 samples
  'message.content.[].input.model'?: string; // present in 382/54883 samples
  'message.content.[].input.name'?: string; // present in 32/54883 samples
  'message.content.[].input.new_often'?: string; // present in 1/54883 samples
  'message.content.[].input.new_str'?: string; // present in 1/54883 samples
  'message.content.[].input.new_string'?: string; // present in 1367/54883 samples
  'message.content.[].input.offset'?: number; // present in 915/54883 samples
  'message.content.[].input.old_key'?: string; // present in 1/54883 samples
  'message.content.[].input.old_string'?: string; // present in 1368/54883 samples
  'message.content.[].input.output_mode'?: string; // present in 188/54883 samples
  'message.content.[].input.path'?: string; // present in 193/54883 samples
  'message.content.[].input.pattern'?: string; // present in 190/54883 samples
  'message.content.[].input.persistent'?: string; // present in 16/54883 samples
  'message.content.[].input.prompt'?: string; // present in 396/54883 samples
  'message.content.[].input.query'?: string; // present in 69/54883 samples
  'message.content.[].input.questions'?: object; // present in 14/54883 samples
  'message.content.[].input.replace_all'?: boolean; // present in 6/54883 samples
  'message.content.[].input.run_in_background'?: boolean | string; // present in 327/54883 samples
  'message.content.[].input.skill'?: string; // present in 23/54883 samples
  'message.content.[].input.subagent_type'?: string; // present in 386/54883 samples
  'message.content.[].input.summary'?: string; // present in 84/54883 samples
  'message.content.[].input.task_id'?: string; // present in 119/54883 samples
  'message.content.[].input.timeout'?: number; // present in 653/54883 samples
  'message.content.[].input.timeout_ms'?: number | string; // present in 38/54883 samples
  'message.content.[].input.to'?: string; // present in 84/54883 samples
  'message.content.[].input.type'?: string; // present in 1/54883 samples
  'message.content.[].input.url'?: string; // present in 10/54883 samples
  'message.content.[].is_error'?: boolean; // present in 3581/54883 samples
  'message.content.[].name'?: string; // present in 14798/54883 samples
  'message.content.[].signature'?: string; // present in 9489/54883 samples
  'message.content.[].source'?: object; // present in 23/54883 samples
  'message.content.[].source.data'?: string; // present in 23/54883 samples
  'message.content.[].source.media_type'?: string; // present in 23/54883 samples
  'message.content.[].source.type'?: string; // present in 23/54883 samples
  'message.content.[].text'?: string; // present in 35072/54883 samples
  'message.content.[].thinking'?: string; // present in 9489/54883 samples
  'message.content.[].tool'?: object; // present in 624/54883 samples
  'message.content.[].tool.definition'?: object; // present in 623/54883 samples
  'message.content.[].tool.name'?: string; // present in 1/54883 samples
  'message.content.[].tool.type'?: string; // present in 624/54883 samples
  'message.content.[].tool_use_id'?: string; // present in 5493/54883 samples
  'message.content.[].type'?: string; // present in 53074/54883 samples
  'message.output_config'?: object; // present in 1443/54883 samples
  'message.output_config.effort'?: string; // present in 1443/54883 samples
  'message.role': string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"api-request-shape"`. Observed 1653 time(s), CLI "2.1.301–2.1.306".
 */
export interface ApiRequestShape {
  agentId?: string; // present in 1399/1653 samples
  sessionId: string;
  shape: object;
  'shape.system': object;
  'shape.system.[]': object;
  'shape.system.[].text': string;
  'shape.system.[].type': string;
  'shape.tools': object;
  'shape.tools.[]': object;
  'shape.tools.[].defer_loading': boolean;
  'shape.tools.[].description': string;
  'shape.tools.[].eager_input_streaming': boolean;
  'shape.tools.[].input_schema': object;
  'shape.tools.[].input_schema.$schema': string;
  'shape.tools.[].input_schema.additionalProperties': boolean | object;
  'shape.tools.[].input_schema.properties': object;
  'shape.tools.[].input_schema.required': object;
  'shape.tools.[].input_schema.type': string;
  'shape.tools.[].model'?: string; // present in 1652/1653 samples
  'shape.tools.[].name': string;
  'shape.tools.[].type'?: string; // present in 1652/1653 samples
  shapeHash: string;
  timestamp: string;
  type: string;
  version: string;
}

/**
 * Transcript type `"artifact-autoreact-ledger"`. Observed 173 time(s), CLI "(unknown)".
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
 * Transcript type `"artifact-comment-monitor"`. Observed 54 time(s), CLI "(unknown)".
 */
export interface ArtifactCommentMonitor {
  artifacts: object;
  'artifacts.[dynamic-key]': object;
  sessionId: string;
  type: string;
  v: number;
}

/**
 * Transcript type `"assistant"`. Observed 2088452 time(s), CLI "2.1.215–2.1.306".
 */
export interface Assistant {
  advisorModel?: string; // present in 455769/2088452 samples
  agentId?: string; // present in 1534153/2088452 samples
  apiBlockIndex?: number; // present in 1201611/2088452 samples
  apiError?: string; // present in 21/2088452 samples
  apiErrorParams?: object; // present in 17/2088452 samples
  'apiErrorParams.media'?: string; // present in 2/2088452 samples
  'apiErrorParams.media_reason'?: string; // present in 2/2088452 samples
  'apiErrorParams.rate_limit_info'?: object; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.isUsingOverage'?: boolean; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.overageDisabledReason'?: string; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.overageStatus'?: string; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.rateLimitType'?: string; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.resetsAt'?: number; // present in 15/2088452 samples
  'apiErrorParams.rate_limit_info.status'?: string; // present in 15/2088452 samples
  apiErrorStatus?: number; // present in 204/2088452 samples
  attributionAgent?: string; // present in 1518273/2088452 samples
  attributionMcpServer?: string; // present in 92716/2088452 samples
  attributionMcpTool?: string; // present in 92716/2088452 samples
  attributionPlugin?: string; // present in 340100/2088452 samples
  attributionSkill?: string; // present in 688953/2088452 samples
  cwd: string;
  effort?: string; // present in 1995392/2088452 samples
  entrypoint: string;
  error?: string; // present in 386/2088452 samples
  errorDetails?: string; // present in 4/2088452 samples
  gitBranch: string;
  healsDistinctCarrier?: boolean; // present in 2/2088452 samples
  isAbortedMidStream?: boolean; // present in 39/2088452 samples
  isApiErrorMessage?: boolean; // present in 447/2088452 samples
  isSidechain: boolean;
  message: object;
  'message.container'?: object; // present in 974434/2088452 samples
  'message.content': object;
  'message.content.[]': object;
  'message.content.[].caller'?: object; // present in 1168803/2088452 samples
  'message.content.[].caller.type'?: string; // present in 1168803/2088452 samples
  'message.content.[].citations'?: object; // present in 2/2088452 samples
  'message.content.[].from'?: object; // present in 2/2088452 samples
  'message.content.[].from.model'?: string; // present in 2/2088452 samples
  'message.content.[].id'?: string; // present in 1168804/2088452 samples
  'message.content.[].input'?: object; // present in 1168804/2088452 samples
  'message.content.[].input.Bash'?: string; // present in 1/2088452 samples
  'message.content.[].input.Bash_description'?: string; // present in 1/2088452 samples
  'message.content.[].input.Description'?: string; // present in 1/2088452 samples
  'message.content.[].input.LINES'?: string; // present in 1/2088452 samples
  'message.content.[].input.[dynamic-key]'?: boolean | number | object | string; // present in 54986/2088452 samples
  'message.content.[].input.__unparsedToolInput'?: object; // present in 156/2088452 samples
  'message.content.[].input.action'?: string; // present in 529/2088452 samples
  'message.content.[].input.allow_large'?: boolean; // present in 4/2088452 samples
  'message.content.[].input.allowed_domains'?: object; // present in 20/2088452 samples
  'message.content.[].input.area'?: string; // present in 1/2088452 samples
  'message.content.[].input.args'?: object | string; // present in 2513/2088452 samples
  'message.content.[].input.character'?: number; // present in 6/2088452 samples
  'message.content.[].input.code'?: string; // present in 15/2088452 samples
  'message.content.[].input.command'?: string; // present in 645447/2088452 samples
  'message.content.[].input.command_note'?: string; // present in 1/2088452 samples
  'message.content.[].input.content'?: string; // present in 35762/2088452 samples
  'message.content.[].input.context'?: number; // present in 4/2088452 samples
  'message.content.[].input.cron'?: string; // present in 4/2088452 samples
  'message.content.[].input.cwd'?: string; // present in 2/2088452 samples
  'message.content.[].input.dangerouslyDisableSandbox'?: boolean; // present in 128/2088452 samples
  'message.content.[].input.delaySeconds'?: number; // present in 233/2088452 samples
  'message.content.[].input.describe'?: string; // present in 1/2088452 samples
  'message.content.[].input.description'?: string; // present in 584976/2088452 samples
  'message.content.[].input.design_systems'?: boolean; // present in 1/2088452 samples
  'message.content.[].input.destination'?: string; // present in 1/2088452 samples
  'message.content.[].input.difftool'?: string; // present in 1/2088452 samples
  'message.content.[].input.discard_changes'?: boolean; // present in 52/2088452 samples
  'message.content.[].input.download'?: string; // present in 1/2088452 samples
  'message.content.[].input.filePath'?: string; // present in 6/2088452 samples
  'message.content.[].input.file_content_note'?: string; // present in 1/2088452 samples
  'message.content.[].input.file_path'?: string; // present in 400884/2088452 samples
  'message.content.[].input.file_text'?: string; // present in 11/2088452 samples
  'message.content.[].input.glob'?: string; // present in 1676/2088452 samples
  'message.content.[].input.head_limit'?: number | string; // present in 2378/2088452 samples
  'message.content.[].input.icon'?: string; // present in 4/2088452 samples
  'message.content.[].input.id'?: string; // present in 7/2088452 samples
  'message.content.[].input.intent'?: string; // present in 13/2088452 samples
  'message.content.[].input.isolation'?: string; // present in 44/2088452 samples
  'message.content.[].input.label'?: string; // present in 16/2088452 samples
  'message.content.[].input.language'?: string; // present in 15/2088452 samples
  'message.content.[].input.limit'?: number; // present in 65106/2088452 samples
  'message.content.[].input.line'?: number; // present in 6/2088452 samples
  'message.content.[].input.max_results'?: number | string; // present in 9972/2088452 samples
  'message.content.[].input.message'?: string; // present in 4187/2088452 samples
  'message.content.[].input.mode'?: string; // present in 146/2088452 samples
  'message.content.[].input.model'?: string; // present in 24101/2088452 samples
  'message.content.[].input.multiline'?: boolean; // present in 38/2088452 samples
  'message.content.[].input.name'?: string; // present in 9315/2088452 samples
  'message.content.[].input.new_new_string_placeholder'?: string; // present in 7/2088452 samples
  'message.content.[].input.new_often'?: string; // present in 1/2088452 samples
  'message.content.[].input.new_source'?: string; // present in 1/2088452 samples
  'message.content.[].input.new_string'?: string; // present in 100061/2088452 samples
  'message.content.[].input.new_text'?: string; // present in 1/2088452 samples
  'message.content.[].input.noop'?: boolean; // present in 161/2088452 samples
  'message.content.[].input.offset'?: number | object; // present in 57545/2088452 samples
  'message.content.[].input.old_key'?: string; // present in 1/2088452 samples
  'message.content.[].input.old_string'?: string; // present in 100068/2088452 samples
  'message.content.[].input.operation'?: string; // present in 6/2088452 samples
  'message.content.[].input.output_mode'?: string; // present in 14076/2088452 samples
  'message.content.[].input.path'?: string; // present in 12361/2088452 samples
  'message.content.[].input.pattern'?: string; // present in 16513/2088452 samples
  'message.content.[].input.persistent'?: boolean | string; // present in 530/2088452 samples
  'message.content.[].input.plan'?: string; // present in 10/2088452 samples
  'message.content.[].input.planFilePath'?: string; // present in 10/2088452 samples
  'message.content.[].input.prompt'?: string; // present in 28607/2088452 samples
  'message.content.[].input.query'?: string; // present in 12312/2088452 samples
  'message.content.[].input.questions'?: object; // present in 2843/2088452 samples
  'message.content.[].input.reason'?: string; // present in 233/2088452 samples
  'message.content.[].input.recipient'?: string; // present in 4175/2088452 samples
  'message.content.[].input.recipient_kind'?: string; // present in 269/2088452 samples
  'message.content.[].input.recurring'?: boolean; // present in 4/2088452 samples
  'message.content.[].input.replace_all'?: boolean | string; // present in 100019/2088452 samples
  'message.content.[].input.run_in_background'?: boolean | string; // present in 25742/2088452 samples
  'message.content.[].input.script'?: string; // present in 6/2088452 samples
  'message.content.[].input.server'?: string; // present in 2/2088452 samples
  'message.content.[].input.skill'?: string; // present in 4940/2088452 samples
  'message.content.[].input.status'?: string; // present in 1/2088452 samples
  'message.content.[].input.stop'?: boolean; // present in 92/2088452 samples
  'message.content.[].input.subagent_type'?: string; // present in 26580/2088452 samples
  'message.content.[].input.summary'?: string; // present in 4146/2088452 samples
  'message.content.[].input.target_id'?: string; // present in 2/2088452 samples
  'message.content.[].input.target_type'?: string; // present in 2/2088452 samples
  'message.content.[].input.task_id'?: string; // present in 759/2088452 samples
  'message.content.[].input.timeout'?: number | string; // present in 66618/2088452 samples
  'message.content.[].input.timeout_ms'?: number | string; // present in 913/2088452 samples
  'message.content.[].input.to'?: string; // present in 4180/2088452 samples
  'message.content.[].input.type'?: string; // present in 4190/2088452 samples
  'message.content.[].input.until'?: string; // present in 2/2088452 samples
  'message.content.[].input.url'?: string; // present in 1727/2088452 samples
  'message.content.[].name'?: string; // present in 1168804/2088452 samples
  'message.content.[].signature'?: string; // present in 672850/2088452 samples
  'message.content.[].text'?: string; // present in 246932/2088452 samples
  'message.content.[].thinking'?: string; // present in 672850/2088452 samples
  'message.content.[].to'?: object; // present in 2/2088452 samples
  'message.content.[].to.model'?: string; // present in 2/2088452 samples
  'message.content.[].type': string;
  'message.context_management'?: object; // present in 974542/2088452 samples
  'message.context_management.applied_edits'?: object; // present in 186/2088452 samples
  'message.diagnostics'?: object; // present in 2088371/2088452 samples
  'message.diagnostics.cache_miss_reason'?: object; // present in 15861/2088452 samples
  'message.diagnostics.cache_miss_reason.cache_missed_input_tokens'?: number; // present in 11742/2088452 samples
  'message.diagnostics.cache_miss_reason.type'?: string; // present in 15861/2088452 samples
  'message.id': string;
  'message.input_transformations'?: object; // present in 766335/2088452 samples
  'message.input_transformations.[]'?: object; // present in 10700/2088452 samples
  'message.input_transformations.[].path'?: string; // present in 10700/2088452 samples
  'message.input_transformations.[].reason'?: string; // present in 10700/2088452 samples
  'message.input_transformations.[].type'?: string; // present in 10700/2088452 samples
  'message.model': string;
  'message.role': string;
  'message.stop_details': object;
  'message.stop_details.category'?: string; // present in 17/2088452 samples
  'message.stop_details.explanation'?: string; // present in 17/2088452 samples
  'message.stop_details.fallback_has_prefill_claim'?: boolean; // present in 1/2088452 samples
  'message.stop_details.type'?: string; // present in 17/2088452 samples
  'message.stop_reason': object | string;
  'message.stop_sequence': object | string;
  'message.type': string;
  'message.usage': object;
  'message.usage.cache_creation': object;
  'message.usage.cache_creation.ephemeral_1h_input_tokens': number;
  'message.usage.cache_creation.ephemeral_5m_input_tokens': number;
  'message.usage.cache_creation_input_tokens': number;
  'message.usage.cache_read_input_tokens': number;
  'message.usage.fallback_credit'?: object; // present in 256812/2088452 samples
  'message.usage.inference_geo': object | string;
  'message.usage.input_tokens': number;
  'message.usage.iterations'?: object; // present in 1151990/2088452 samples
  'message.usage.iterations.[]'?: object; // present in 1151451/2088452 samples
  'message.usage.iterations.[].cache_creation'?: object; // present in 1151451/2088452 samples
  'message.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 1151451/2088452 samples
  'message.usage.iterations.[].cache_read_input_tokens'?: number; // present in 1151451/2088452 samples
  'message.usage.iterations.[].input_tokens'?: number; // present in 1151451/2088452 samples
  'message.usage.iterations.[].model'?: object | string; // present in 48/2088452 samples
  'message.usage.iterations.[].output_tokens'?: number; // present in 1151451/2088452 samples
  'message.usage.iterations.[].type'?: string; // present in 1151451/2088452 samples
  'message.usage.output_tokens': number;
  'message.usage.output_tokens_details'?: object; // present in 958721/2088452 samples
  'message.usage.output_tokens_details.thinking_tokens'?: number; // present in 958355/2088452 samples
  'message.usage.server_tool_use'?: object; // present in 1151990/2088452 samples
  'message.usage.server_tool_use.web_fetch_requests'?: number; // present in 1151990/2088452 samples
  'message.usage.server_tool_use.web_search_requests'?: number; // present in 1151990/2088452 samples
  'message.usage.service_tier': object | string;
  'message.usage.speed'?: object | string; // present in 1178311/2088452 samples
  parentUuid: string;
  perTurnEffort?: object | string; // present in 881177/2088452 samples
  quotaLimits?: object; // present in 122/2088452 samples
  'quotaLimits.isUsingOverage'?: boolean; // present in 122/2088452 samples
  'quotaLimits.overageDisabledReason'?: string; // present in 122/2088452 samples
  'quotaLimits.overageStatus'?: string; // present in 122/2088452 samples
  'quotaLimits.rateLimitType'?: string; // present in 122/2088452 samples
  'quotaLimits.resetsAt'?: number; // present in 122/2088452 samples
  'quotaLimits.status'?: string; // present in 122/2088452 samples
  'quotaLimits.unifiedRateLimitFallbackAvailable'?: boolean; // present in 122/2088452 samples
  requestId?: string; // present in 2088208/2088452 samples
  requestRef?: string; // present in 75162/2088452 samples
  requestedModel?: string; // present in 141578/2088452 samples
  serverClassifierRequest?: string; // present in 8/2088452 samples
  sessionId: string;
  session_id?: string; // present in 18784/2088452 samples
  slug?: string; // present in 457256/2088452 samples
  supersedesUuids?: object; // present in 10/2088452 samples
  'supersedesUuids.[]'?: string; // present in 10/2088452 samples
  thinkingDisplay?: string; // present in 21736/2088452 samples
  thinkingDurationMs?: number; // present in 116260/2088452 samples
  timestamp: string;
  truncatedAfterOutput?: boolean; // present in 4/2088452 samples
  type: string;
  userType: string;
  uuid: string;
  version: string;
  wireIngestContext?: object; // present in 90754/2088452 samples
  'wireIngestContext.[dynamic-key]'?: object; // present in 90754/2088452 samples
  wireToolInputs?: object; // present in 466662/2088452 samples
  'wireToolInputs.[dynamic-key]'?: object; // present in 466662/2088452 samples
}

/**
 * Transcript type `"atis-latch"`. Observed 101144 time(s), CLI "(unknown)".
 */
export interface AtisLatch {
  atis: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"attachment"`. Observed 4911749 time(s), CLI "2.1.215–2.1.306".
 */
export interface Attachment {
  agentId?: string; // present in 3253401/4911749 samples
  attachment: object;
  'attachment.addedBlocks'?: object; // present in 15319/4911749 samples
  'attachment.addedBlocks.[]'?: string; // present in 15228/4911749 samples
  'attachment.addedLines'?: object; // present in 52969/4911749 samples
  'attachment.addedLines.[]'?: string; // present in 42519/4911749 samples
  'attachment.addedNames'?: object; // present in 52336/4911749 samples
  'attachment.addedNames.[]'?: string; // present in 41864/4911749 samples
  'attachment.addedTypes'?: object; // present in 15952/4911749 samples
  'attachment.addedTypes.[]'?: string; // present in 15927/4911749 samples
  'attachment.allowedTools'?: object; // present in 5561/4911749 samples
  'attachment.allowedTools.[]'?: string; // present in 315/4911749 samples
  'attachment.autoModeConsentFlow'?: boolean; // present in 9765/4911749 samples
  'attachment.banner'?: string; // present in 1420/4911749 samples
  'attachment.bashFirst'?: boolean; // present in 9768/4911749 samples
  'attachment.bashFirstSteer'?: string; // present in 8877/4911749 samples
  'attachment.blockHashes'?: object; // present in 97/4911749 samples
  'attachment.blockHashes.[]'?: string; // present in 97/4911749 samples
  'attachment.blockingError'?: object; // present in 5227/4911749 samples
  'attachment.blockingError.blockingError'?: string; // present in 5227/4911749 samples
  'attachment.blockingError.command'?: string; // present in 5227/4911749 samples
  'attachment.builtInPluginTypes'?: object; // present in 153/4911749 samples
  'attachment.builtInTypes'?: object; // present in 3407/4911749 samples
  'attachment.builtInTypes.[]'?: string; // present in 3397/4911749 samples
  'attachment.bypass'?: boolean; // present in 9765/4911749 samples
  'attachment.canContinueAgent'?: boolean; // present in 8/4911749 samples
  'attachment.changed'?: boolean; // present in 504/4911749 samples
  'attachment.changes'?: object; // present in 669/4911749 samples
  'attachment.changes.[]'?: object; // present in 669/4911749 samples
  'attachment.changes.[].added'?: object; // present in 14/4911749 samples
  'attachment.changes.[].added.[]'?: string; // present in 11/4911749 samples
  'attachment.changes.[].field'?: string; // present in 669/4911749 samples
  'attachment.changes.[].from'?: string; // present in 642/4911749 samples
  'attachment.changes.[].removed'?: object; // present in 14/4911749 samples
  'attachment.changes.[].removed.[]'?: string; // present in 3/4911749 samples
  'attachment.clearAt'?: string; // present in 210/4911749 samples
  'attachment.cliPrefix'?: string; // present in 11738/4911749 samples
  'attachment.clientChange'?: object; // present in 97/4911749 samples
  'attachment.clientChange.baseline'?: string; // present in 97/4911749 samples
  'attachment.clientChange.callNumber'?: number; // present in 97/4911749 samples
  'attachment.clientChange.firstChangedMessageIndex'?: number; // present in 97/4911749 samples
  'attachment.clientChange.kinds'?: string; // present in 97/4911749 samples
  'attachment.command'?: string; // present in 3542573/4911749 samples
  'attachment.commandMode'?: string; // present in 13981/4911749 samples
  'attachment.commit'?: string; // present in 11528/4911749 samples
  'attachment.condition'?: string; // present in 1251/4911749 samples
  'attachment.content'?: object | string; // present in 3932194/4911749 samples
  'attachment.content.[]'?: object | string; // present in 249559/4911749 samples
  'attachment.content.[].activeForm'?: string; // present in 3008/4911749 samples
  'attachment.content.[].content'?: string; // present in 3008/4911749 samples
  'attachment.content.[].status'?: string; // present in 3008/4911749 samples
  'attachment.content.content'?: string; // present in 105656/4911749 samples
  'attachment.content.contentDiffersFromDisk'?: boolean; // present in 105656/4911749 samples
  'attachment.content.file'?: object; // present in 699/4911749 samples
  'attachment.content.file.content'?: string; // present in 697/4911749 samples
  'attachment.content.file.filePath'?: string; // present in 699/4911749 samples
  'attachment.content.file.numLines'?: number; // present in 697/4911749 samples
  'attachment.content.file.startLine'?: number; // present in 697/4911749 samples
  'attachment.content.file.totalLines'?: number; // present in 697/4911749 samples
  'attachment.content.globs'?: object; // present in 78505/4911749 samples
  'attachment.content.globs.[]'?: string; // present in 78505/4911749 samples
  'attachment.content.parent'?: string; // present in 1367/4911749 samples
  'attachment.content.path'?: string; // present in 105656/4911749 samples
  'attachment.content.rawContent'?: string; // present in 81204/4911749 samples
  'attachment.content.type'?: string; // present in 106355/4911749 samples
  'attachment.context'?: object; // present in 12624/4911749 samples
  'attachment.context.gitStatus'?: string; // present in 11547/4911749 samples
  'attachment.context.userEmail'?: string; // present in 12488/4911749 samples
  'attachment.contextRendering'?: string; // present in 15095/4911749 samples
  'attachment.data'?: object; // present in 2187/4911749 samples
  'attachment.data.[dynamic-key]'?: object | string; // present in 453/4911749 samples
  'attachment.data.findings'?: object; // present in 1729/4911749 samples
  'attachment.data.findings.[]'?: object; // present in 40/4911749 samples
  'attachment.data.findings.[].category'?: string; // present in 40/4911749 samples
  'attachment.data.findings.[].confidence'?: number; // present in 31/4911749 samples
  'attachment.data.findings.[].explanation'?: string; // present in 40/4911749 samples
  'attachment.data.findings.[].filePath'?: string; // present in 40/4911749 samples
  'attachment.data.findings.[].fix'?: string; // present in 40/4911749 samples
  'attachment.data.findings.[].severity'?: string; // present in 40/4911749 samples
  'attachment.data.findings.[].vulnerableCode'?: string; // present in 40/4911749 samples
  'attachment.data.refuted'?: object; // present in 5/4911749 samples
  'attachment.data.survived'?: object; // present in 5/4911749 samples
  'attachment.data.survived.[]'?: number; // present in 5/4911749 samples
  'attachment.date'?: string; // present in 13252/4911749 samples
  'attachment.delivery_id'?: string; // present in 3242/4911749 samples
  'attachment.deltaSummary'?: object | string; // present in 173/4911749 samples
  'attachment.description'?: string; // present in 173/4911749 samples
  'attachment.digests'?: object; // present in 183/4911749 samples
  'attachment.digests.[]'?: string; // present in 183/4911749 samples
  'attachment.displayPath'?: string; // present in 106572/4911749 samples
  'attachment.durationMs'?: number; // present in 3542715/4911749 samples
  'attachment.echoWireToolInputs'?: boolean; // present in 15095/4911749 samples
  'attachment.entries'?: object; // present in 84636/4911749 samples
  'attachment.entries.[]'?: object; // present in 5565/4911749 samples
  'attachment.entries.[].defer_loading'?: boolean; // present in 5565/4911749 samples
  'attachment.entries.[].description'?: string; // present in 5565/4911749 samples
  'attachment.entries.[].eager_input_streaming'?: boolean; // present in 5565/4911749 samples
  'attachment.entries.[].input_schema'?: object; // present in 5565/4911749 samples
  'attachment.entries.[].input_schema.$schema'?: string; // present in 3868/4911749 samples
  'attachment.entries.[].input_schema.additionalProperties'?: boolean | object; // present in 1476/4911749 samples
  'attachment.entries.[].input_schema.description'?: string; // present in 1/4911749 samples
  'attachment.entries.[].input_schema.properties'?: object; // present in 5565/4911749 samples
  'attachment.entries.[].input_schema.required'?: object; // present in 5175/4911749 samples
  'attachment.entries.[].input_schema.type'?: string; // present in 5565/4911749 samples
  'attachment.entries.[].name'?: string; // present in 5565/4911749 samples
  'attachment.exitCode'?: number; // present in 3540009/4911749 samples
  'attachment.failed'?: boolean; // present in 5/4911749 samples
  'attachment.failedMcpServers'?: object; // present in 12690/4911749 samples
  'attachment.failedMcpServers.[]'?: object; // present in 8226/4911749 samples
  'attachment.failedMcpServers.[].error'?: string; // present in 8226/4911749 samples
  'attachment.failedMcpServers.[].errorCode'?: string; // present in 8087/4911749 samples
  'attachment.failedMcpServers.[].name'?: string; // present in 8226/4911749 samples
  'attachment.filename'?: string; // present in 5815/4911749 samples
  'attachment.files'?: object; // present in 16997/4911749 samples
  'attachment.files.[]'?: object; // present in 16997/4911749 samples
  'attachment.files.[].content'?: string; // present in 12329/4911749 samples
  'attachment.files.[].diagnostics'?: object; // present in 4668/4911749 samples
  'attachment.files.[].diagnostics.[]'?: object; // present in 4668/4911749 samples
  'attachment.files.[].path'?: string; // present in 12329/4911749 samples
  'attachment.files.[].type'?: string; // present in 12329/4911749 samples
  'attachment.files.[].uri'?: string; // present in 4668/4911749 samples
  'attachment.firstReportForThreadInProcess'?: boolean; // present in 97/4911749 samples
  'attachment.hookEvent'?: string; // present in 3799732/4911749 samples
  'attachment.hookName'?: string; // present in 3799732/4911749 samples
  'attachment.humanTurn'?: boolean; // present in 497/4911749 samples
  'attachment.ideName'?: string; // present in 7/4911749 samples
  'attachment.identity'?: object; // present in 12532/4911749 samples
  'attachment.identity.knowledgeCutoff'?: object | string; // present in 12532/4911749 samples
  'attachment.identity.marketingName'?: object | string; // present in 12532/4911749 samples
  'attachment.identity.modelId'?: string; // present in 12532/4911749 samples
  'attachment.imagePasteIds'?: object; // present in 1/4911749 samples
  'attachment.imagePasteIds.[]'?: number; // present in 1/4911749 samples
  'attachment.inlineTools'?: boolean; // present in 5037/4911749 samples
  'attachment.isInitial'?: boolean; // present in 44837/4911749 samples
  'attachment.isMeta'?: boolean; // present in 741/4911749 samples
  'attachment.isNew'?: boolean; // present in 4668/4911749 samples
  'attachment.isSubAgent'?: boolean; // present in 37/4911749 samples
  'attachment.itemCount'?: number; // present in 8949/4911749 samples
  'attachment.iterations'?: number; // present in 142/4911749 samples
  'attachment.keptReminders'?: boolean; // present in 6725/4911749 samples
  'attachment.language'?: string; // present in 1299/4911749 samples
  'attachment.lineEnd'?: number; // present in 7/4911749 samples
  'attachment.lineStart'?: number; // present in 7/4911749 samples
  'attachment.managedCommit'?: boolean; // present in 11176/4911749 samples
  'attachment.managedPr'?: boolean; // present in 11176/4911749 samples
  'attachment.maxTurns'?: number; // present in 276/4911749 samples
  'attachment.met'?: boolean; // present in 1251/4911749 samples
  'attachment.model'?: string; // present in 6658/4911749 samples
  'attachment.nameOnlyAnnouncements'?: object; // present in 3886/4911749 samples
  'attachment.nameOnlyAnnouncements.[]'?: string; // present in 3886/4911749 samples
  'attachment.names'?: object; // present in 28885/4911749 samples
  'attachment.names.[]'?: string; // present in 28885/4911749 samples
  'attachment.needsAuthMcpServers'?: object; // present in 15327/4911749 samples
  'attachment.needsAuthMcpServers.[]'?: string; // present in 9835/4911749 samples
  'attachment.newDate'?: string; // present in 556/4911749 samples
  'attachment.newlyDropped'?: object; // present in 97/4911749 samples
  'attachment.newlyDropped.blockCount'?: number; // present in 97/4911749 samples
  'attachment.newlyDropped.first'?: object; // present in 97/4911749 samples
  'attachment.newlyDropped.first.blockIndex'?: number; // present in 97/4911749 samples
  'attachment.newlyDropped.first.messageIndex'?: number; // present in 97/4911749 samples
  'attachment.newlyDropped.last'?: object; // present in 97/4911749 samples
  'attachment.newlyDropped.last.blockIndex'?: number; // present in 97/4911749 samples
  'attachment.newlyDropped.last.messageIndex'?: number; // present in 97/4911749 samples
  'attachment.newlyDropped.reason'?: string; // present in 97/4911749 samples
  'attachment.newlyDropped.reasonCounts'?: object; // present in 92/4911749 samples
  'attachment.newlyDropped.reasonCounts.model_mismatch'?: number; // present in 12/4911749 samples
  'attachment.newlyDropped.reasonCounts.other'?: number; // present in 17/4911749 samples
  'attachment.newlyDropped.reasonCounts.prefix_mismatch'?: number; // present in 65/4911749 samples
  'attachment.newlyDropped.turnCount'?: number; // present in 97/4911749 samples
  'attachment.organizationUuid'?: string; // present in 8288/4911749 samples
  'attachment.origin'?: object; // present in 6369/4911749 samples
  'attachment.origin.body'?: string; // present in 314/4911749 samples
  'attachment.origin.from'?: string; // present in 314/4911749 samples
  'attachment.origin.fromMode'?: string; // present in 22/4911749 samples
  'attachment.origin.hopChain'?: object; // present in 4/4911749 samples
  'attachment.origin.hopChain.[]'?: string; // present in 4/4911749 samples
  'attachment.origin.kind'?: string; // present in 6369/4911749 samples
  'attachment.origin.msg_id'?: string; // present in 22/4911749 samples
  'attachment.origin.name'?: string; // present in 314/4911749 samples
  'attachment.origin.producer'?: string; // present in 3661/4911749 samples
  'attachment.origin.senderTaskId'?: string; // present in 292/4911749 samples
  'attachment.origin.verifiedPeerPid'?: number; // present in 22/4911749 samples
  'attachment.outputFilePath'?: string; // present in 173/4911749 samples
  'attachment.path'?: string; // present in 105657/4911749 samples
  'attachment.pendingMcpServers'?: object; // present in 15959/4911749 samples
  'attachment.pendingMcpServers.[]'?: string; // present in 247/4911749 samples
  'attachment.planExists'?: boolean; // present in 46/4911749 samples
  'attachment.planFilePath'?: string; // present in 46/4911749 samples
  'attachment.pr'?: string; // present in 11528/4911749 samples
  'attachment.prompt'?: object | string; // present in 14553/4911749 samples
  'attachment.prompt.[]'?: object; // present in 1895/4911749 samples
  'attachment.prompt.[].source'?: object; // present in 61/4911749 samples
  'attachment.prompt.[].source.data'?: string; // present in 61/4911749 samples
  'attachment.prompt.[].source.media_type'?: string; // present in 61/4911749 samples
  'attachment.prompt.[].source.type'?: string; // present in 61/4911749 samples
  'attachment.prompt.[].text'?: string; // present in 1894/4911749 samples
  'attachment.prompt.[].type'?: string; // present in 1895/4911749 samples
  'attachment.promptRewritten'?: boolean; // present in 2/4911749 samples
  'attachment.querySource'?: string; // present in 97/4911749 samples
  'attachment.readdedNames'?: object; // present in 37017/4911749 samples
  'attachment.readdedNames.[]'?: string; // present in 47/4911749 samples
  'attachment.reason'?: string; // present in 1224/4911749 samples
  'attachment.reminderFold'?: boolean; // present in 16459/4911749 samples
  'attachment.reminderId'?: string; // present in 130/4911749 samples
  'attachment.reminderType'?: string; // present in 37/4911749 samples
  'attachment.removed'?: object; // present in 82/4911749 samples
  'attachment.removed.[]'?: string; // present in 82/4911749 samples
  'attachment.removedByBlock'?: object; // present in 1/4911749 samples
  'attachment.removedByBlock.[]'?: string; // present in 1/4911749 samples
  'attachment.removedNames'?: object; // present in 52336/4911749 samples
  'attachment.removedNames.[]'?: string; // present in 517/4911749 samples
  'attachment.removedTypes'?: object; // present in 15952/4911749 samples
  'attachment.removedTypes.[]'?: string; // present in 28/4911749 samples
  'attachment.requestId'?: string; // present in 97/4911749 samples
  'attachment.retractedTools'?: object; // present in 1/4911749 samples
  'attachment.retractedTools.[]'?: object; // present in 1/4911749 samples
  'attachment.retractedTools.[].cause'?: string; // present in 1/4911749 samples
  'attachment.retractedTools.[].name'?: string; // present in 1/4911749 samples
  'attachment.runId'?: string; // present in 1733/4911749 samples
  'attachment.scope'?: string; // present in 16/4911749 samples
  'attachment.sendMessageToolAbsent'?: boolean; // present in 1/4911749 samples
  'attachment.sendUserFileHint'?: boolean; // present in 11528/4911749 samples
  'attachment.sentinel'?: boolean; // present in 246/4911749 samples
  'attachment.shell'?: object; // present in 9/4911749 samples
  'attachment.shell.command'?: string; // present in 9/4911749 samples
  'attachment.shell.kind'?: string; // present in 9/4911749 samples
  'attachment.shell.toolUseId'?: string; // present in 9/4911749 samples
  'attachment.showConcurrencyNote'?: boolean; // present in 15952/4911749 samples
  'attachment.skillCount'?: number; // present in 28885/4911749 samples
  'attachment.skillDir'?: string; // present in 61/4911749 samples
  'attachment.skillName'?: string; // present in 85/4911749 samples
  'attachment.skillNames'?: object; // present in 61/4911749 samples
  'attachment.skillNames.[]'?: string; // present in 61/4911749 samples
  'attachment.skills'?: object; // present in 111/4911749 samples
  'attachment.skills.[]'?: object; // present in 111/4911749 samples
  'attachment.skills.[].content'?: string; // present in 111/4911749 samples
  'attachment.skills.[].name'?: string; // present in 111/4911749 samples
  'attachment.skills.[].path'?: string; // present in 111/4911749 samples
  'attachment.snapshot'?: object; // present in 12860/4911749 samples
  'attachment.snapshot.additionalWorkingDirectories'?: object; // present in 12860/4911749 samples
  'attachment.snapshot.additionalWorkingDirectories.[]'?: string; // present in 12138/4911749 samples
  'attachment.snapshot.isGitRepo'?: boolean; // present in 12860/4911749 samples
  'attachment.snapshot.isWorktree'?: boolean; // present in 12860/4911749 samples
  'attachment.snapshot.osVersion'?: string; // present in 12860/4911749 samples
  'attachment.snapshot.platform'?: string; // present in 12860/4911749 samples
  'attachment.snapshot.scratchpadDirectory'?: string; // present in 11533/4911749 samples
  'attachment.snapshot.shell'?: string; // present in 12860/4911749 samples
  'attachment.snapshot.workingDirectory'?: string; // present in 12860/4911749 samples
  'attachment.snippet'?: string; // present in 4935/4911749 samples
  'attachment.source_uuid'?: string; // present in 7783/4911749 samples
  'attachment.status'?: string; // present in 173/4911749 samples
  'attachment.stderr'?: string; // present in 3540009/4911749 samples
  'attachment.stdout'?: string; // present in 3540009/4911749 samples
  'attachment.steerOnly'?: boolean; // present in 9768/4911749 samples
  'attachment.style'?: object | string; // present in 139909/4911749 samples
  'attachment.style.name'?: string; // present in 1301/4911749 samples
  'attachment.style.prompt'?: string; // present in 1301/4911749 samples
  'attachment.surfacedDefinitions'?: object; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[]'?: object; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].definition'?: object; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].definition.description'?: string; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].definition.eager_input_streaming'?: boolean; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].definition.input_schema'?: object; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].definition.name'?: string; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].listing'?: string; // present in 1698/4911749 samples
  'attachment.surfacedDefinitions.[].name'?: string; // present in 1698/4911749 samples
  'attachment.surfacedNames'?: object; // present in 7409/4911749 samples
  'attachment.surfacedNames.[]'?: string; // present in 7409/4911749 samples
  'attachment.systemPrompt'?: object; // present in 23749/4911749 samples
  'attachment.systemPrompt.[]'?: string; // present in 23749/4911749 samples
  'attachment.systemTurns'?: boolean; // present in 6725/4911749 samples
  'attachment.taskId'?: string; // present in 173/4911749 samples
  'attachment.taskType'?: string; // present in 173/4911749 samples
  'attachment.text'?: string; // present in 533042/4911749 samples
  'attachment.thinkingBlocksSent'?: number; // present in 97/4911749 samples
  'attachment.thinkingTurnsSent'?: number; // present in 97/4911749 samples
  'attachment.timedOut'?: boolean; // present in 2564/4911749 samples
  'attachment.timeoutMs'?: number; // present in 2564/4911749 samples
  'attachment.timestamp'?: string; // present in 13981/4911749 samples
  'attachment.tokens'?: number; // present in 142/4911749 samples
  'attachment.toolChangeHeader'?: boolean; // present in 5037/4911749 samples
  'attachment.toolInputCopies'?: object; // present in 75303/4911749 samples
  'attachment.toolInputCopies.[]'?: object; // present in 75303/4911749 samples
  'attachment.toolInputCopies.[].copy'?: string; // present in 75303/4911749 samples
  'attachment.toolInputCopies.[].id'?: string; // present in 75303/4911749 samples
  'attachment.toolUseID'?: string; // present in 3803417/4911749 samples
  'attachment.tools'?: object; // present in 11825/4911749 samples
  'attachment.tools.[]'?: object; // present in 11434/4911749 samples
  'attachment.tools.[].description'?: string; // present in 11434/4911749 samples
  'attachment.tools.[].name'?: string; // present in 11434/4911749 samples
  'attachment.tools.[].schema'?: object; // present in 11434/4911749 samples
  'attachment.tools.[].schema.description'?: string; // present in 11434/4911749 samples
  'attachment.tools.[].schema.eager_input_streaming'?: boolean; // present in 11434/4911749 samples
  'attachment.tools.[].schema.input_schema'?: object; // present in 11434/4911749 samples
  'attachment.tools.[].schema.name'?: string; // present in 11434/4911749 samples
  'attachment.tools.[].server'?: string; // present in 1/4911749 samples
  'attachment.turnCount'?: number; // present in 276/4911749 samples
  'attachment.turnReminder'?: string; // present in 138606/4911749 samples
  'attachment.type': string;
  'attachment.url'?: object; // present in 11528/4911749 samples
  'attachment.usage'?: object; // present in 1767/4911749 samples
  'attachment.usage.durationMs'?: number; // present in 1767/4911749 samples
  'attachment.usage.toolUses'?: number; // present in 1767/4911749 samples
  'attachment.usage.totalTokens'?: number; // present in 1767/4911749 samples
  'attachment.wireHiddenNames'?: object; // present in 24893/4911749 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isSidechain: boolean;
  parentUuid: object | string;
  rendered?: object; // present in 841559/4911749 samples
  'rendered.[]'?: object; // present in 841559/4911749 samples
  'rendered.[].content'?: object | string; // present in 841559/4911749 samples
  'rendered.[].content.[]'?: object; // present in 733/4911749 samples
  'rendered.[].content.[].text'?: string; // present in 733/4911749 samples
  'rendered.[].content.[].type'?: string; // present in 733/4911749 samples
  renderedBesideToolResult?: boolean; // present in 4526/4911749 samples
  renderedInHumanTurn?: object; // present in 6159/4911749 samples
  'renderedInHumanTurn.[]'?: object; // present in 6159/4911749 samples
  'renderedInHumanTurn.[].content'?: string; // present in 6159/4911749 samples
  renderedRole?: string; // present in 422484/4911749 samples
  sessionId: string;
  session_id?: string; // present in 69916/4911749 samples
  slug?: string; // present in 1406563/4911749 samples
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
 * Transcript type `"cost-state"`. Observed 1223 time(s), CLI "(unknown)".
 */
export interface CostState {
  hasUnknownModelCost: boolean;
  modelUsage: object;
  'modelUsage.[dynamic-key]'?: object; // present in 1067/1223 samples
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
 * Transcript type `"custom-title"`. Observed 44277 time(s), CLI "(unknown)".
 */
export interface CustomTitle {
  customTitle: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"file-history-delta"`. Observed 13282 time(s), CLI "(unknown)".
 */
export interface FileHistoryDelta {
  backup: object;
  'backup.backupFileName': object | string;
  'backup.backupTime': string;
  'backup.realParentDir'?: string; // present in 13276/13282 samples
  'backup.version': number;
  messageId: string;
  snapshotMessageId: string;
  timestamp: string;
  trackingPath: string;
  type: string;
}

/**
 * Transcript type `"file-history-snapshot"`. Observed 15289 time(s), CLI "(unknown)".
 */
export interface FileHistorySnapshot {
  isSnapshotUpdate: boolean;
  messageId: string;
  snapshot: object;
  'snapshot.messageId': string;
  'snapshot.preCheckpoint'?: boolean; // present in 12/15289 samples
  'snapshot.timestamp': string;
  'snapshot.trackedFileBackups': object;
  'snapshot.trackedFileBackups.[dynamic-key]'?: object; // present in 7154/15289 samples
  type: string;
}

/**
 * Transcript type `"frame-link"`. Observed 931 time(s), CLI "(unknown)".
 */
export interface FrameLink {
  artifactCount?: number; // present in 921/931 samples
  frameUrl?: string; // present in 42/931 samples
  path?: string; // present in 42/931 samples
  sessionId: string;
  timestamp: string;
  title?: string; // present in 42/931 samples
  type: string;
}

/**
 * Transcript type `"last-prompt"`. Observed 137651 time(s), CLI "(unknown)".
 */
export interface LastPrompt {
  lastPrompt?: string; // present in 133470/137651 samples
  leafUuid: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"mode"`. Observed 25786 time(s), CLI "(unknown)".
 */
export interface Mode {
  mode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"permission-mode"`. Observed 7442 time(s), CLI "(unknown)".
 */
export interface PermissionMode {
  permissionMode: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"pr-link"`. Observed 52894 time(s), CLI "(unknown)".
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
 * Transcript type `"queue-operation"`. Observed 102536 time(s), CLI "(unknown)".
 */
export interface QueueOperation {
  commandUuid?: string; // present in 3276/102536 samples
  content?: string; // present in 50896/102536 samples
  deliveryId?: string; // present in 2912/102536 samples
  operation: string;
  reason?: string; // present in 9274/102536 samples
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Transcript type `"relocated"`. Observed 25524 time(s), CLI "(unknown)".
 */
export interface Relocated {
  relocatedCwd: string;
  sessionId: string;
  type: string;
}

/**
 * Transcript type `"system:agents_killed"`. Observed 6 time(s), CLI "2.1.258–2.1.289".
 */
export interface SystemAgentsKilled {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  parentUuid: string;
  sessionId: string;
  slug?: string; // present in 4/6 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:api_error"`. Observed 1140 time(s), CLI "2.1.218–2.1.302".
 */
export interface SystemApiError {
  cwd: string;
  entrypoint: string;
  error: object;
  'error.connection': object;
  'error.connection.code'?: string; // present in 767/1140 samples
  'error.connection.isSSLError'?: boolean; // present in 767/1140 samples
  'error.connection.message'?: string; // present in 767/1140 samples
  'error.formatted': string;
  'error.isNetworkDown': boolean;
  'error.message': string;
  'error.noResponse'?: object; // present in 544/1140 samples
  'error.noResponse.retryWaitMs'?: number; // present in 2/1140 samples
  'error.noResponse.waitedMs'?: number; // present in 2/1140 samples
  'error.rateLimits': object;
  'error.requestId'?: string; // present in 347/1140 samples
  'error.status'?: number; // present in 350/1140 samples
  gitBranch: string;
  isSidechain: boolean;
  level: string;
  maxRetries: number;
  parentUuid: string;
  retryAttempt: number;
  retryInMs: number;
  sessionId: string;
  slug?: string; // present in 132/1140 samples
  source: string;
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:away_summary"`. Observed 181 time(s), CLI "2.1.258–2.1.295".
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
  slug?: string; // present in 47/181 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:compact_boundary"`. Observed 152 time(s), CLI "2.1.220–2.1.304".
 */
export interface SystemCompactBoundary {
  agentId?: string; // present in 26/152 samples
  compactMetadata: object;
  'compactMetadata.cumulativeDroppedTokens': number;
  'compactMetadata.durationMs': number;
  'compactMetadata.postTokens': number;
  'compactMetadata.preCompactDiscoveredTools'?: object; // present in 138/152 samples
  'compactMetadata.preCompactDiscoveredTools.[]'?: string; // present in 138/152 samples
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
  'compactMetadata.runningTurnSends'?: object; // present in 4/152 samples
  'compactMetadata.runningTurnSends.openerUuid'?: string; // present in 4/152 samples
  'compactMetadata.runningTurnSends.summarisedOnly'?: object; // present in 1/152 samples
  'compactMetadata.runningTurnSends.summarisedOnly.[]'?: string; // present in 1/152 samples
  'compactMetadata.runningTurnSends.uuids'?: object; // present in 4/152 samples
  'compactMetadata.runningTurnSends.uuids.[]'?: string; // present in 3/152 samples
  'compactMetadata.trigger': string;
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta?: boolean; // present in 55/152 samples
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
 * Transcript type `"system:informational"`. Observed 68 time(s), CLI "2.1.223–2.1.304".
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
  slug?: string; // present in 12/68 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:local_command"`. Observed 338 time(s), CLI "2.1.218–2.1.304".
 */
export interface SystemLocalCommand {
  commandRun?: object; // present in 152/338 samples
  'commandRun.args'?: string; // present in 152/338 samples
  'commandRun.command'?: string; // present in 152/338 samples
  'commandRun.plugin'?: string; // present in 2/338 samples
  content: string;
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  isMeta: boolean;
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  sessionId: string;
  slug?: string; // present in 40/338 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"system:model_refusal_fallback"`. Observed 27 time(s), CLI "2.1.261–2.1.282".
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
  'retractedMessageUuids.[]'?: string; // present in 10/27 samples
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
 * Transcript type `"system:stop_hook_summary"`. Observed 33808 time(s), CLI "2.1.215–2.1.306".
 */
export interface SystemStopHookSummary {
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  hasOutput: boolean;
  hookAdditionalContext: object;
  'hookAdditionalContext.[]'?: string; // present in 46/33808 samples
  hookCount: number;
  hookErrors: object;
  'hookErrors.[]'?: string; // present in 916/33808 samples
  hookInfos: object;
  'hookInfos.[]': object;
  'hookInfos.[].command': string;
  'hookInfos.[].durationMs': number;
  'hookInfos.[].promptText'?: string; // present in 933/33808 samples
  isSidechain: boolean;
  level: string;
  parentUuid: string;
  preventedContinuation: boolean;
  sessionId: string;
  session_id?: string; // present in 1566/33808 samples
  slug?: string; // present in 8274/33808 samples
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
 * Transcript type `"system:turn_duration"`. Observed 1477 time(s), CLI "2.1.220–2.1.295".
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
  pendingBackgroundAgentCount?: number; // present in 831/1477 samples
  sessionId: string;
  slug?: string; // present in 494/1477 samples
  subtype: string;
  timestamp: string;
  type: string;
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"user"`. Observed 1256278 time(s), CLI "2.1.215–2.1.306".
 */
export interface User {
  agentId?: string; // present in 912133/1256278 samples
  classifierBoundary?: boolean; // present in 1/1256278 samples
  cwd: string;
  entrypoint: string;
  gitBranch: string;
  imagePasteIds?: object; // present in 119/1256278 samples
  'imagePasteIds.[]'?: number; // present in 119/1256278 samples
  interruptedByShutdown?: boolean; // present in 709/1256278 samples
  interruptedMessageId?: string; // present in 2/1256278 samples
  isCompactSummary?: boolean; // present in 152/1256278 samples
  isMeta?: boolean; // present in 22215/1256278 samples
  isSidechain: boolean;
  isVisibleInTranscriptOnly?: boolean; // present in 152/1256278 samples
  joinedNoticeLengths?: object; // present in 20/1256278 samples
  'joinedNoticeLengths.[]'?: number; // present in 20/1256278 samples
  joinedNoticeOwn?: object; // present in 20/1256278 samples
  'joinedNoticeOwn.[]'?: boolean; // present in 20/1256278 samples
  joinedNoticeRunIds?: object; // present in 20/1256278 samples
  'joinedNoticeRunIds.[]'?: object | string; // present in 20/1256278 samples
  mcpMeta?: object; // present in 8294/1256278 samples
  'mcpMeta._meta'?: object; // present in 2674/1256278 samples
  'mcpMeta._meta.[dynamic-key]'?: object; // present in 2674/1256278 samples
  'mcpMeta.structuredContent'?: object; // present in 5620/1256278 samples
  'mcpMeta.structuredContent.[dynamic-key]'?: boolean | number | object | string; // present in 28147/1256278 samples
  message: object;
  'message.content': object | string;
  'message.content.[]'?: object; // present in 1186557/1256278 samples
  'message.content.[].content'?: object | string; // present in 1169319/1256278 samples
  'message.content.[].content.[]'?: object; // present in 71970/1256278 samples
  'message.content.[].is_error'?: boolean; // present in 655071/1256278 samples
  'message.content.[].source'?: object; // present in 363/1256278 samples
  'message.content.[].source.data'?: string; // present in 363/1256278 samples
  'message.content.[].source.media_type'?: string; // present in 363/1256278 samples
  'message.content.[].source.type'?: string; // present in 363/1256278 samples
  'message.content.[].text'?: string; // present in 17233/1256278 samples
  'message.content.[].title'?: string; // present in 21/1256278 samples
  'message.content.[].tool_use_id'?: string; // present in 1169319/1256278 samples
  'message.content.[].type'?: string; // present in 1186557/1256278 samples
  'message.role': string;
  origin?: object; // present in 35540/1256278 samples
  'origin.body'?: string; // present in 783/1256278 samples
  'origin.from'?: string; // present in 783/1256278 samples
  'origin.fromMode'?: string; // present in 10/1256278 samples
  'origin.hopChain'?: object; // present in 2/1256278 samples
  'origin.hopChain.[]'?: string; // present in 2/1256278 samples
  'origin.kind'?: string; // present in 35540/1256278 samples
  'origin.msg_id'?: string; // present in 10/1256278 samples
  'origin.name'?: string; // present in 793/1256278 samples
  'origin.producer'?: string; // present in 5960/1256278 samples
  'origin.runId'?: string; // present in 3472/1256278 samples
  'origin.senderTaskId'?: string; // present in 773/1256278 samples
  'origin.verifiedPeerPid'?: number; // present in 10/1256278 samples
  parentUuid: object | string;
  permissionDecision?: object; // present in 95821/1256278 samples
  'permissionDecision.decision'?: string; // present in 95821/1256278 samples
  'permissionDecision.reasonType'?: string; // present in 95146/1256278 samples
  'permissionDecision.source'?: string; // present in 95821/1256278 samples
  permissionMode?: string; // present in 36895/1256278 samples
  promptId?: string; // present in 1256160/1256278 samples
  promptSource?: string; // present in 36897/1256278 samples
  queueOrigin?: object; // present in 5/1256278 samples
  'queueOrigin.kind'?: string; // present in 5/1256278 samples
  'queueOrigin.source'?: string; // present in 5/1256278 samples
  queuePriority?: string; // present in 10/1256278 samples
  queueSkipAttachments?: boolean; // present in 16102/1256278 samples
  queueSkipSlashCommands?: boolean; // present in 5/1256278 samples
  queueTranscriptOnly?: boolean; // present in 23/1256278 samples
  refusedMessageId?: string; // present in 4/1256278 samples
  repeatsCompactSummary?: boolean; // present in 1/1256278 samples
  sessionId: string;
  session_id?: string; // present in 10423/1256278 samples
  slug?: string; // present in 273404/1256278 samples
  sourceToolAssistantUUID?: string; // present in 1169319/1256278 samples
  sourceToolUseID?: string; // present in 5262/1256278 samples
  summarizedTurnPromptUuids?: object; // present in 7/1256278 samples
  'summarizedTurnPromptUuids.[]'?: string; // present in 7/1256278 samples
  timestamp: string;
  toolDenialKind?: string; // present in 3962/1256278 samples
  toolDenialUnanswered?: string; // present in 1/1256278 samples
  toolEndsTurn?: boolean; // present in 2187/1256278 samples
  toolUseResult?: object | string; // present in 384431/1256278 samples
  'toolUseResult.[]'?: object; // present in 5240/1256278 samples
  'toolUseResult.[].description'?: string; // present in 2/1256278 samples
  'toolUseResult.[].mimeType'?: string; // present in 2/1256278 samples
  'toolUseResult.[].name'?: string; // present in 2/1256278 samples
  'toolUseResult.[].server'?: string; // present in 2/1256278 samples
  'toolUseResult.[].text'?: string; // present in 5238/1256278 samples
  'toolUseResult.[].type'?: string; // present in 5238/1256278 samples
  'toolUseResult.[].uri'?: string; // present in 2/1256278 samples
  'toolUseResult.action'?: string; // present in 460/1256278 samples
  'toolUseResult.agentId'?: string; // present in 25055/1256278 samples
  'toolUseResult.agentType'?: string; // present in 7212/1256278 samples
  'toolUseResult.agent_id'?: string; // present in 10/1256278 samples
  'toolUseResult.agent_type'?: string; // present in 10/1256278 samples
  'toolUseResult.allowedTools'?: object; // present in 100/1256278 samples
  'toolUseResult.allowedTools.[]'?: string; // present in 100/1256278 samples
  'toolUseResult.annotations'?: object; // present in 45/1256278 samples
  'toolUseResult.annotations.[dynamic-key]'?: object; // present in 2/1256278 samples
  'toolUseResult.answers'?: object; // present in 2794/1256278 samples
  'toolUseResult.answers.[dynamic-key]'?: string; // present in 2794/1256278 samples
  'toolUseResult.appliedLimit'?: number; // present in 745/1256278 samples
  'toolUseResult.artifact_id'?: string; // present in 32/1256278 samples
  'toolUseResult.artifacts'?: object; // present in 3/1256278 samples
  'toolUseResult.artifacts.[]'?: object; // present in 3/1256278 samples
  'toolUseResult.artifacts.[].[dynamic-key]'?: string; // present in 7/1256278 samples
  'toolUseResult.audience'?: string; // present in 20/1256278 samples
  'toolUseResult.background'?: boolean; // present in 11/1256278 samples
  'toolUseResult.backgroundCwdHint'?: string; // present in 383/1256278 samples
  'toolUseResult.backgroundTaskId'?: string; // present in 9132/1256278 samples
  'toolUseResult.bashEditDiff'?: object; // present in 9466/1256278 samples
  'toolUseResult.bashEditDiff.changedFiles'?: object; // present in 1795/1256278 samples
  'toolUseResult.bashEditDiff.changedFiles.[]'?: string; // present in 1795/1256278 samples
  'toolUseResult.bashEditDiff.files'?: object; // present in 9466/1256278 samples
  'toolUseResult.bashEditDiff.files.[]'?: object; // present in 1733/1256278 samples
  'toolUseResult.bashEditDiff.files.[].created'?: boolean; // present in 425/1256278 samples
  'toolUseResult.bashEditDiff.files.[].deleted'?: boolean; // present in 185/1256278 samples
  'toolUseResult.bashEditDiff.files.[].filePath'?: string; // present in 1733/1256278 samples
  'toolUseResult.bashEditDiff.files.[].hunks'?: object; // present in 1733/1256278 samples
  'toolUseResult.bashEditDiff.moreFiles'?: number; // present in 9466/1256278 samples
  'toolUseResult.bashEditDiff.shared'?: boolean; // present in 7461/1256278 samples
  'toolUseResult.bashEditDiff.skipped'?: boolean; // present in 1/1256278 samples
  'toolUseResult.bashEditDiff.unavailable'?: boolean; // present in 462/1256278 samples
  'toolUseResult.bytes'?: number; // present in 254/1256278 samples
  'toolUseResult.canContinueAgent'?: boolean; // present in 3532/1256278 samples
  'toolUseResult.canReadOutputFile'?: boolean; // present in 17742/1256278 samples
  'toolUseResult.cancelledWakeups'?: number; // present in 92/1256278 samples
  'toolUseResult.clampedDelaySeconds'?: number; // present in 288/1256278 samples
  'toolUseResult.code'?: number; // present in 254/1256278 samples
  'toolUseResult.codeText'?: string; // present in 254/1256278 samples
  'toolUseResult.color'?: string; // present in 10/1256278 samples
  'toolUseResult.command'?: string; // present in 426/1256278 samples
  'toolUseResult.commandName'?: string; // present in 3154/1256278 samples
  'toolUseResult.content'?: object | string; // present in 26358/1256278 samples
  'toolUseResult.content.[]'?: object; // present in 7212/1256278 samples
  'toolUseResult.content.[].text'?: string; // present in 7212/1256278 samples
  'toolUseResult.content.[].type'?: string; // present in 7212/1256278 samples
  'toolUseResult.contentNotInModelContext'?: boolean; // present in 3154/1256278 samples
  'toolUseResult.contract'?: string; // present in 20/1256278 samples
  'toolUseResult.countIsComplete'?: boolean; // present in 1485/1256278 samples
  'toolUseResult.dangerouslyDisableSandbox'?: boolean; // present in 41/1256278 samples
  'toolUseResult.description'?: string; // present in 17742/1256278 samples
  'toolUseResult.disabledReason'?: string; // present in 12/1256278 samples
  'toolUseResult.discardedCommits'?: number; // present in 56/1256278 samples
  'toolUseResult.discardedFiles'?: number; // present in 56/1256278 samples
  'toolUseResult.display'?: string; // present in 38/1256278 samples
  'toolUseResult.durable'?: boolean; // present in 4/1256278 samples
  'toolUseResult.durationMs'?: number; // present in 1739/1256278 samples
  'toolUseResult.durationSeconds'?: number; // present in 170/1256278 samples
  'toolUseResult.failed_mcp_servers'?: object; // present in 58/1256278 samples
  'toolUseResult.failed_mcp_servers.[]'?: object; // present in 58/1256278 samples
  'toolUseResult.failed_mcp_servers.[].error'?: string; // present in 58/1256278 samples
  'toolUseResult.failed_mcp_servers.[].errorCode'?: string; // present in 58/1256278 samples
  'toolUseResult.failed_mcp_servers.[].name'?: string; // present in 58/1256278 samples
  'toolUseResult.file'?: object; // present in 45946/1256278 samples
  'toolUseResult.file.base64'?: string; // present in 324/1256278 samples
  'toolUseResult.file.content'?: string; // present in 45603/1256278 samples
  'toolUseResult.file.dimensions'?: object; // present in 324/1256278 samples
  'toolUseResult.file.dimensions.displayHeight'?: number; // present in 324/1256278 samples
  'toolUseResult.file.dimensions.displayWidth'?: number; // present in 324/1256278 samples
  'toolUseResult.file.dimensions.originalHeight'?: number; // present in 324/1256278 samples
  'toolUseResult.file.dimensions.originalWidth'?: number; // present in 324/1256278 samples
  'toolUseResult.file.filePath'?: string; // present in 45622/1256278 samples
  'toolUseResult.file.numLines'?: number; // present in 45603/1256278 samples
  'toolUseResult.file.originalSize'?: number; // present in 324/1256278 samples
  'toolUseResult.file.startLine'?: number; // present in 45603/1256278 samples
  'toolUseResult.file.totalLines'?: number; // present in 45603/1256278 samples
  'toolUseResult.file.truncatedByTokenCap'?: boolean; // present in 127/1256278 samples
  'toolUseResult.file.type'?: string; // present in 324/1256278 samples
  'toolUseResult.fileCount'?: number; // present in 46/1256278 samples
  'toolUseResult.filePath'?: string; // present in 28051/1256278 samples
  'toolUseResult.filenames'?: object; // present in 11561/1256278 samples
  'toolUseResult.filenames.[]'?: string; // present in 4882/1256278 samples
  'toolUseResult.ghRateLimitHint'?: string; // present in 3/1256278 samples
  'toolUseResult.gitOperation'?: object; // present in 8826/1256278 samples
  'toolUseResult.gitOperation.branch'?: object; // present in 465/1256278 samples
  'toolUseResult.gitOperation.branch.action'?: string; // present in 465/1256278 samples
  'toolUseResult.gitOperation.branch.ref'?: string; // present in 465/1256278 samples
  'toolUseResult.gitOperation.commit'?: object; // present in 3354/1256278 samples
  'toolUseResult.gitOperation.commit.branch'?: string; // present in 2628/1256278 samples
  'toolUseResult.gitOperation.commit.kind'?: string; // present in 3354/1256278 samples
  'toolUseResult.gitOperation.commit.sha'?: string; // present in 3354/1256278 samples
  'toolUseResult.gitOperation.pr'?: object; // present in 2499/1256278 samples
  'toolUseResult.gitOperation.pr.action'?: string; // present in 2499/1256278 samples
  'toolUseResult.gitOperation.pr.number'?: number; // present in 2499/1256278 samples
  'toolUseResult.gitOperation.pr.url'?: string; // present in 1850/1256278 samples
  'toolUseResult.gitOperation.push'?: object; // present in 2672/1256278 samples
  'toolUseResult.gitOperation.push.branch'?: string; // present in 2672/1256278 samples
  'toolUseResult.harnessNoteCount'?: number; // present in 4205/1256278 samples
  'toolUseResult.harnessSectionHash'?: string; // present in 4205/1256278 samples
  'toolUseResult.harnessTailCount'?: number; // present in 4205/1256278 samples
  'toolUseResult.hasTaskTool'?: boolean; // present in 3/1256278 samples
  'toolUseResult.humanSchedule'?: string; // present in 4/1256278 samples
  'toolUseResult.icon'?: string; // present in 3/1256278 samples
  'toolUseResult.id'?: string; // present in 4/1256278 samples
  'toolUseResult.interrupted'?: boolean; // present in 185747/1256278 samples
  'toolUseResult.isAgent'?: boolean; // present in 3/1256278 samples
  'toolUseResult.isAsync'?: boolean; // present in 17742/1256278 samples
  'toolUseResult.isImage'?: boolean; // present in 185747/1256278 samples
  'toolUseResult.is_splitpane'?: boolean; // present in 10/1256278 samples
  'toolUseResult.listing'?: string; // present in 7571/1256278 samples
  'toolUseResult.liveSubscription'?: string; // present in 42/1256278 samples
  'toolUseResult.localSent'?: boolean; // present in 12/1256278 samples
  'toolUseResult.matches'?: object; // present in 4190/1256278 samples
  'toolUseResult.matches.[]'?: string; // present in 4105/1256278 samples
  'toolUseResult.memdirStamped'?: boolean; // present in 74/1256278 samples
  'toolUseResult.message'?: string; // present in 4384/1256278 samples
  'toolUseResult.mode'?: string; // present in 10076/1256278 samples
  'toolUseResult.model'?: string; // present in 290/1256278 samples
  'toolUseResult.msg_id'?: string; // present in 56/1256278 samples
  'toolUseResult.name'?: string; // present in 10/1256278 samples
  'toolUseResult.newString'?: string; // present in 15116/1256278 samples
  'toolUseResult.newTodos'?: object; // present in 2610/1256278 samples
  'toolUseResult.newTodos.[]'?: object; // present in 2610/1256278 samples
  'toolUseResult.newTodos.[].activeForm'?: string; // present in 2610/1256278 samples
  'toolUseResult.newTodos.[].content'?: string; // present in 2610/1256278 samples
  'toolUseResult.newTodos.[].status'?: string; // present in 2610/1256278 samples
  'toolUseResult.noOutputExpected'?: boolean; // present in 185747/1256278 samples
  'toolUseResult.notes'?: object; // present in 76/1256278 samples
  'toolUseResult.numFiles'?: number; // present in 11561/1256278 samples
  'toolUseResult.numLines'?: number; // present in 6188/1256278 samples
  'toolUseResult.numMatches'?: number; // present in 74/1256278 samples
  'toolUseResult.oldString'?: string; // present in 15116/1256278 samples
  'toolUseResult.oldTodos'?: object; // present in 2610/1256278 samples
  'toolUseResult.oldTodos.[]'?: object; // present in 2209/1256278 samples
  'toolUseResult.oldTodos.[].activeForm'?: string; // present in 2209/1256278 samples
  'toolUseResult.oldTodos.[].content'?: string; // present in 2209/1256278 samples
  'toolUseResult.oldTodos.[].status'?: string; // present in 2209/1256278 samples
  'toolUseResult.operation'?: string; // present in 48/1256278 samples
  'toolUseResult.originalCwd'?: string; // present in 460/1256278 samples
  'toolUseResult.originalCwdMissing'?: boolean; // present in 165/1256278 samples
  'toolUseResult.originalFile'?: object | string; // present in 28000/1256278 samples
  'toolUseResult.outputFile'?: string; // present in 17742/1256278 samples
  'toolUseResult.owned'?: boolean; // present in 2/1256278 samples
  'toolUseResult.path'?: string; // present in 42/1256278 samples
  'toolUseResult.persistedOutputPath'?: string; // present in 632/1256278 samples
  'toolUseResult.persistedOutputSize'?: number; // present in 632/1256278 samples
  'toolUseResult.persistent'?: boolean; // present in 261/1256278 samples
  'toolUseResult.pin'?: object; // present in 2786/1256278 samples
  'toolUseResult.pin.id'?: string; // present in 2786/1256278 samples
  'toolUseResult.pin.name'?: string; // present in 2786/1256278 samples
  'toolUseResult.pin.ref'?: string; // present in 2786/1256278 samples
  'toolUseResult.pins_enabled'?: boolean; // present in 1/1256278 samples
  'toolUseResult.plan'?: string; // present in 3/1256278 samples
  'toolUseResult.plan_mode_required'?: boolean; // present in 10/1256278 samples
  'toolUseResult.prompt'?: string; // present in 24964/1256278 samples
  'toolUseResult.pushSent'?: boolean; // present in 12/1256278 samples
  'toolUseResult.query'?: string; // present in 4360/1256278 samples
  'toolUseResult.questions'?: object; // present in 2794/1256278 samples
  'toolUseResult.questions.[]'?: object; // present in 2794/1256278 samples
  'toolUseResult.questions.[].header'?: string; // present in 2794/1256278 samples
  'toolUseResult.questions.[].multiSelect'?: boolean; // present in 2794/1256278 samples
  'toolUseResult.questions.[].options'?: object; // present in 2794/1256278 samples
  'toolUseResult.questions.[].options.[]'?: object; // present in 2794/1256278 samples
  'toolUseResult.questions.[].question'?: string; // present in 2794/1256278 samples
  'toolUseResult.quickstart'?: object; // present in 4/1256278 samples
  'toolUseResult.quickstart.dashboard_type'?: object; // present in 1/1256278 samples
  'toolUseResult.quickstart.dashboard_type.description'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.dashboard_type.tier'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.dashboard_type.title'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.dashboard_type.type_url'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.design_guidance'?: boolean; // present in 3/1256278 samples
  'toolUseResult.quickstart.design_systems_off'?: boolean; // present in 1/1256278 samples
  'toolUseResult.quickstart.intent'?: string; // present in 4/1256278 samples
  'toolUseResult.quickstart.match'?: object; // present in 1/1256278 samples
  'toolUseResult.quickstart.match.description'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.match.tier'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.match.title'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.match.type_url'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.types'?: object; // present in 1/1256278 samples
  'toolUseResult.quickstart.types.[]'?: object; // present in 1/1256278 samples
  'toolUseResult.quickstart.types.[].description'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.types.[].tier'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.types.[].title'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.types.[].type_url'?: string; // present in 1/1256278 samples
  'toolUseResult.quickstart.types_hooked'?: boolean; // present in 2/1256278 samples
  'toolUseResult.quickstart.types_note'?: string; // present in 2/1256278 samples
  'toolUseResult.recurring'?: boolean; // present in 4/1256278 samples
  'toolUseResult.replaceAll'?: boolean; // present in 15116/1256278 samples
  'toolUseResult.resolvedModel'?: string; // present in 24954/1256278 samples
  'toolUseResult.restoredCwd'?: string; // present in 165/1256278 samples
  'toolUseResult.result'?: string; // present in 403/1256278 samples
  'toolUseResult.resultCount'?: number; // present in 46/1256278 samples
  'toolUseResult.results'?: object; // present in 170/1256278 samples
  'toolUseResult.results.[]'?: object | string; // present in 170/1256278 samples
  'toolUseResult.results.[].content'?: object; // present in 170/1256278 samples
  'toolUseResult.results.[].content.[]'?: object; // present in 170/1256278 samples
  'toolUseResult.results.[].tool_use_id'?: string; // present in 170/1256278 samples
  'toolUseResult.resumedAgentId'?: string; // present in 1915/1256278 samples
  'toolUseResult.retrieval_status'?: string; // present in 159/1256278 samples
  'toolUseResult.returnCodeInterpretation'?: string; // present in 364/1256278 samples
  'toolUseResult.revivedAgentId'?: string; // present in 62/1256278 samples
  'toolUseResult.routing'?: object; // present in 24/1256278 samples
  'toolUseResult.routing.content'?: string; // present in 24/1256278 samples
  'toolUseResult.routing.sender'?: string; // present in 24/1256278 samples
  'toolUseResult.routing.senderColor'?: string; // present in 22/1256278 samples
  'toolUseResult.routing.summary'?: string; // present in 24/1256278 samples
  'toolUseResult.routing.target'?: string; // present in 24/1256278 samples
  'toolUseResult.routing.targetColor'?: string; // present in 24/1256278 samples
  'toolUseResult.runId'?: string; // present in 6/1256278 samples
  'toolUseResult.scheduledFor'?: number; // present in 288/1256278 samples
  'toolUseResult.scriptPath'?: string; // present in 6/1256278 samples
  'toolUseResult.searchCount'?: number; // present in 170/1256278 samples
  'toolUseResult.sections'?: object; // present in 76/1256278 samples
  'toolUseResult.sections.[]'?: object; // present in 76/1256278 samples
  'toolUseResult.sections.[].kind'?: string; // present in 76/1256278 samples
  'toolUseResult.sections.[].rows'?: object; // present in 76/1256278 samples
  'toolUseResult.sections.[].rows.[]'?: object; // present in 76/1256278 samples
  'toolUseResult.sections.[].total'?: number; // present in 76/1256278 samples
  'toolUseResult.sentAt'?: string; // present in 12/1256278 samples
  'toolUseResult.seq'?: number; // present in 4/1256278 samples
  'toolUseResult.source'?: string; // present in 2/1256278 samples
  'toolUseResult.staleReadFileStateHint'?: string; // present in 226/1256278 samples
  'toolUseResult.staleRecovered'?: boolean; // present in 148/1256278 samples
  'toolUseResult.status'?: string; // present in 25071/1256278 samples
  'toolUseResult.stderr'?: string; // present in 185747/1256278 samples
  'toolUseResult.stdout'?: string; // present in 185747/1256278 samples
  'toolUseResult.stopped'?: boolean; // present in 92/1256278 samples
  'toolUseResult.structuredPatch'?: object; // present in 28000/1256278 samples
  'toolUseResult.structuredPatch.[]'?: object; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].lines'?: object; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].lines.[]'?: string; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].newLines'?: number; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].newStart'?: number; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].oldLines'?: number; // present in 16300/1256278 samples
  'toolUseResult.structuredPatch.[].oldStart'?: number; // present in 16300/1256278 samples
  'toolUseResult.success'?: boolean; // present in 6013/1256278 samples
  'toolUseResult.summary'?: string; // present in 6/1256278 samples
  'toolUseResult.task'?: object; // present in 159/1256278 samples
  'toolUseResult.task.description'?: string; // present in 159/1256278 samples
  'toolUseResult.task.exitCode'?: number | object; // present in 52/1256278 samples
  'toolUseResult.task.isRawTranscript'?: boolean; // present in 107/1256278 samples
  'toolUseResult.task.output'?: string; // present in 159/1256278 samples
  'toolUseResult.task.prompt'?: string; // present in 107/1256278 samples
  'toolUseResult.task.result'?: string; // present in 107/1256278 samples
  'toolUseResult.task.status'?: string; // present in 159/1256278 samples
  'toolUseResult.task.task_id'?: string; // present in 159/1256278 samples
  'toolUseResult.task.task_type'?: string; // present in 159/1256278 samples
  'toolUseResult.taskId'?: string; // present in 267/1256278 samples
  'toolUseResult.taskType'?: string; // present in 6/1256278 samples
  'toolUseResult.task_id'?: string; // present in 426/1256278 samples
  'toolUseResult.task_type'?: string; // present in 426/1256278 samples
  'toolUseResult.tasks'?: object; // present in 2/1256278 samples
  'toolUseResult.team_name'?: string; // present in 10/1256278 samples
  'toolUseResult.teammate_id'?: string; // present in 10/1256278 samples
  'toolUseResult.timedOutAfterMs'?: number; // present in 393/1256278 samples
  'toolUseResult.timeoutMs'?: number; // present in 261/1256278 samples
  'toolUseResult.title'?: string; // present in 42/1256278 samples
  'toolUseResult.tmux_pane_id'?: string; // present in 10/1256278 samples
  'toolUseResult.tmux_session_name'?: string; // present in 10/1256278 samples
  'toolUseResult.tmux_window_name'?: string; // present in 10/1256278 samples
  'toolUseResult.toolStats'?: object; // present in 7188/1256278 samples
  'toolUseResult.toolStats.bashCount'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.editFileCount'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.linesAdded'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.linesRemoved'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.otherToolCount'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.readCount'?: number; // present in 7188/1256278 samples
  'toolUseResult.toolStats.searchCount'?: number; // present in 7188/1256278 samples
  'toolUseResult.total'?: number; // present in 1/1256278 samples
  'toolUseResult.totalDurationMs'?: number; // present in 7212/1256278 samples
  'toolUseResult.totalFiles'?: number; // present in 3814/1256278 samples
  'toolUseResult.totalLines'?: number; // present in 6188/1256278 samples
  'toolUseResult.totalMatches'?: number; // present in 1485/1256278 samples
  'toolUseResult.totalTokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.totalToolUseCount'?: number; // present in 7212/1256278 samples
  'toolUseResult.total_deferred_tools'?: number; // present in 4190/1256278 samples
  'toolUseResult.transcriptDir'?: string; // present in 6/1256278 samples
  'toolUseResult.truncated'?: boolean; // present in 1487/1256278 samples
  'toolUseResult.type'?: string; // present in 58830/1256278 samples
  'toolUseResult.updated'?: boolean; // present in 42/1256278 samples
  'toolUseResult.url'?: string; // present in 296/1256278 samples
  'toolUseResult.usage'?: object; // present in 7212/1256278 samples
  'toolUseResult.usage.cache_creation'?: object; // present in 7212/1256278 samples
  'toolUseResult.usage.cache_creation.ephemeral_1h_input_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.cache_creation.ephemeral_5m_input_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.cache_creation_input_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.cache_read_input_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.fallback_credit'?: object; // present in 1299/1256278 samples
  'toolUseResult.usage.inference_geo'?: string; // present in 7212/1256278 samples
  'toolUseResult.usage.input_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.iterations'?: object; // present in 7212/1256278 samples
  'toolUseResult.usage.iterations.[]'?: object; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].cache_creation'?: object; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].cache_creation_input_tokens'?: number; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].cache_read_input_tokens'?: number; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].input_tokens'?: number; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].output_tokens'?: number; // present in 7207/1256278 samples
  'toolUseResult.usage.iterations.[].type'?: string; // present in 7207/1256278 samples
  'toolUseResult.usage.output_tokens'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.output_tokens_details'?: object; // present in 5084/1256278 samples
  'toolUseResult.usage.output_tokens_details.thinking_tokens'?: number; // present in 5084/1256278 samples
  'toolUseResult.usage.server_tool_use'?: object; // present in 7212/1256278 samples
  'toolUseResult.usage.server_tool_use.web_fetch_requests'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.server_tool_use.web_search_requests'?: number; // present in 7212/1256278 samples
  'toolUseResult.usage.service_tier'?: string; // present in 7212/1256278 samples
  'toolUseResult.usage.speed'?: string; // present in 7212/1256278 samples
  'toolUseResult.userModified'?: boolean; // present in 28000/1256278 samples
  'toolUseResult.version'?: string; // present in 42/1256278 samples
  'toolUseResult.wasClamped'?: boolean; // present in 288/1256278 samples
  'toolUseResult.workflowName'?: string; // present in 6/1256278 samples
  'toolUseResult.worktreeBranch'?: string; // present in 279/1256278 samples
  'toolUseResult.worktreePath'?: string; // present in 1090/1256278 samples
  turnCompanion?: boolean; // present in 5173/1256278 samples
  turnOrigin?: string; // present in 13510/1256278 samples
  turnPosition?: object; // present in 8234/1256278 samples
  'turnPosition.promptIndex'?: number; // present in 8234/1256278 samples
  'turnPosition.turnIndex'?: number; // present in 8234/1256278 samples
  type: string;
  usageLimitNote?: string; // present in 6/1256278 samples
  userType: string;
  uuid: string;
  version: string;
}

/**
 * Transcript type `"worktree-state"`. Observed 68743 time(s), CLI "(unknown)".
 */
export interface WorktreeState {
  sessionId: string;
  type: string;
  worktreeSession: object;
  'worktreeSession.enteredExisting'?: boolean; // present in 17903/68743 samples
  'worktreeSession.hookBased'?: boolean; // present in 45422/68743 samples
  'worktreeSession.originalBranch'?: string; // present in 190/68743 samples
  'worktreeSession.originalCwd'?: string; // present in 63515/68743 samples
  'worktreeSession.originalHeadCommit'?: string; // present in 190/68743 samples
  'worktreeSession.preEnterOriginalCwd'?: string; // present in 63515/68743 samples
  'worktreeSession.sessionId'?: string; // present in 63515/68743 samples
  'worktreeSession.worktreeBranch'?: string; // present in 18093/68743 samples
  'worktreeSession.worktreeName'?: string; // present in 63515/68743 samples
  'worktreeSession.worktreePath'?: string; // present in 63515/68743 samples
}
