/**
 * Generates openapi.json from the REST API app routes.
 *
 * The output file (openapi.json) is gitignored because it is a build artifact.
 * Regenerate it via: pnpm generate:openapi (or turbo run generate:openapi).
 * Downstream consumers (e.g., oapi-codegen for Go CLI) should run this task
 * before consuming the spec.
 */
import type { RestApiDependencies } from '../src/types.js'

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { createRestApiApp } from '../src/app.js'
import { OPENAPI_CONFIG } from '../src/openapi-config.js'

const EXPECTED_MIN_PATHS = 5

const stubAuditLogger = {
  log: async () => {},
}

const stubDependencies: RestApiDependencies = {
  auditLogger: stubAuditLogger as RestApiDependencies['auditLogger'],
  createIssue: {} as RestApiDependencies['createIssue'],
  createMilestone: {} as RestApiDependencies['createMilestone'],
  listIssues: {} as RestApiDependencies['listIssues'],
  updateIssue: {} as RestApiDependencies['updateIssue'],
  updateStatus: {} as RestApiDependencies['updateStatus'],
  assignIssue: {} as RestApiDependencies['assignIssue'],
  getMilestoneOverview: {} as RestApiDependencies['getMilestoneOverview'],
  issueRepository: {} as RestApiDependencies['issueRepository'],
  commentRepository: {} as RestApiDependencies['commentRepository'],
}

const app = createRestApiApp(stubDependencies)

const spec = app.getOpenAPI31Document(OPENAPI_CONFIG)

const pathCount = Object.keys(spec.paths ?? {}).length

if (pathCount < EXPECTED_MIN_PATHS) {
  console.error(`Spec validation failed: expected at least ${EXPECTED_MIN_PATHS} paths, found ${pathCount}`)
  process.exit(1)
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDirectory, '..', 'openapi.json')
const specJson = JSON.stringify(spec, null, 2)

writeFileSync(outputPath, `${specJson}\n`, 'utf-8')

console.log(`OpenAPI 3.1 spec written to ${outputPath} (${pathCount} paths, ${Object.keys(spec.components?.schemas ?? {}).length} schemas)`)
