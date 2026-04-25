import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execFile } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve the project root (where scripts/ lives) */
function findProjectRoot(): string {
	// Walk up from __dirname looking for scripts/run_validation.py
	let dir = __dirname;
	for (let i = 0; i < 10; i++) {
		if (existsSync(join(dir, 'scripts', 'run_validation.py'))) {
			return dir;
		}
		dir = dirname(dir);
	}

	// Also check from CWD upward (dev mode: CWD = packages/app)
	dir = process.cwd();
	for (let i = 0; i < 5; i++) {
		if (existsSync(join(dir, 'scripts', 'run_validation.py'))) {
			return dir;
		}
		dir = dirname(dir);
	}

	// Fallback: /mnt/code (Domino deploy)
	if (existsSync('/mnt/code/scripts/run_validation.py')) {
		return '/mnt/code';
	}

	return process.cwd();
}

function findPython(projectRoot: string): string {
	const venvPython = join(projectRoot, 'scripts', '.venv', 'bin', 'python');
	if (existsSync(venvPython)) return venvPython;
	// Fallback to system python3
	return 'python3';
}

function runValidation(
	pythonPath: string,
	scriptPath: string,
	args: string[]
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		execFile(
			pythonPath,
			[scriptPath, ...args],
			{
				timeout: 600_000, // 10 minutes max
				maxBuffer: 50 * 1024 * 1024, // 50MB stdout buffer
				env: { ...process.env, PYTHONUNBUFFERED: '1' }
			},
			(error, stdout, stderr) => {
				// run_validation.py always outputs JSON to stdout (even on error)
				// so we resolve even on non-zero exit — the caller checks the JSON
				if (error && !stdout) {
					reject(new Error(`Python process failed: ${error.message}\nstderr: ${stderr}`));
				} else {
					resolve({ stdout, stderr });
				}
			}
		);
	});
}

export const POST: RequestHandler = async ({ request }) => {
	let tempDir: string | null = null;

	try {
		const formData = await request.formData();

		const standard = formData.get('standard') as string;
		const version = formData.get('version') as string;
		const rulesYaml = formData.get('rules') as string | null;

		if (!standard || !version) {
			return json(
				{ status: 'error', error: 'Missing required fields: standard, version' },
				{ status: 400 }
			);
		}

		// Collect dataset files from form data
		const datasetFiles: File[] = [];
		for (const [key, value] of formData.entries()) {
			if (key === 'datasets' && value instanceof File) {
				datasetFiles.push(value);
			}
		}

		if (datasetFiles.length === 0) {
			return json(
				{ status: 'error', error: 'No dataset files provided' },
				{ status: 400 }
			);
		}

		// Create temp directory for this validation run
		tempDir = join(tmpdir(), `cdisc-validate-${randomUUID()}`);
		await mkdir(tempDir, { recursive: true });

		const datasetDir = join(tempDir, 'datasets');
		await mkdir(datasetDir);

		// Write dataset files to temp
		const datasetPaths: string[] = [];
		for (const file of datasetFiles) {
			const filePath = join(datasetDir, file.name);
			const buffer = Buffer.from(await file.arrayBuffer());
			await writeFile(filePath, buffer);
			datasetPaths.push(filePath);
		}

		// Write rules YAML if provided
		const ruleArgs: string[] = [];
		if (rulesYaml && rulesYaml.trim()) {
			const rulesPath = join(tempDir, 'rules.yaml');
			await writeFile(rulesPath, rulesYaml, 'utf-8');
			ruleArgs.push('--rules', rulesPath);
		}

		// Resolve paths
		const projectRoot = findProjectRoot();
		console.warn(`[api/validate] Project root: ${projectRoot}`);
		const scriptPath = join(projectRoot, 'scripts', 'run_validation.py');
		const pythonPath = findPython(projectRoot);

		// Build command args
		const args = [
			'--datasets', ...datasetPaths,
			...ruleArgs,
			'--standard', standard,
			'--version', version
		];

		console.warn(`[api/validate] Running validation: ${datasetFiles.map(f => f.name).join(', ')}`);
		console.warn(`[api/validate] Standard: ${standard} v${version}, Rules: ${rulesYaml ? 'yes' : 'none'}`);

		const { stdout, stderr } = await runValidation(pythonPath, scriptPath, args);

		if (stderr) {
			console.warn(`[api/validate] Python stderr: ${stderr.substring(0, 500)}`);
		}

		// Parse the JSON output from run_validation.py
		let result: unknown;
		try {
			result = JSON.parse(stdout);
		} catch {
			return json(
				{ status: 'error', error: `Failed to parse engine output: ${stdout.substring(0, 200)}` },
				{ status: 500 }
			);
		}

		return json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[api/validate] Error:`, message);
		return json(
			{ status: 'error', error: message },
			{ status: 500 }
		);
	} finally {
		// Clean up temp files
		if (tempDir) {
			rm(tempDir, { recursive: true, force: true }).catch(() => {});
		}
	}
};
