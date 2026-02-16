import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env')
config({ path: envFilePath })
